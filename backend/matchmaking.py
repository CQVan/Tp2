import collections
import math

class DynamicMatchmaker:
    """
    Manages matchmaking queues that are created and destroyed dynamically
    based on player Elo.
    """

    def __init__(self, bracket_size=200):
        """
        Initializes the matchmaker.
        
        Args:
            bracket_size (int): The Elo range for each queue (e.g., 200).
        """
        self.queues = {}  # Dictionary to hold the dynamic queues
        self.bracket_size = bracket_size

    def _get_bracket_key(self, elo):
        """Calculates a unique key for a given Elo to identify its bracket."""
        if elo <= 0:
            # Handle Elo 0 or less as a special case if needed
            return 0
        # This formula groups players into brackets of size `bracket_size`
        # e.g., for size 200: 1-200 -> key 0, 201-400 -> key 1, etc.
        return math.floor((elo - 1) / self.bracket_size)

    def add_player(self, player):
        """
        Adds a player to the appropriate queue and attempts to make a match.
        
        Args:
            player (dict): A dictionary representing the player, e.g.,
                           {'user_id': 'player123', 'elo': 350}

        Returns:
            list: A list containing the two matched players if a match is made.
            None: If no match is made.
        """
        elo = player.get('elo', 0)
        bracket_key = self._get_bracket_key(elo)

        # Create a queue for the bracket if it doesn't exist
        if bracket_key not in self.queues:
            self.queues[bracket_key] = collections.deque()
            print(f"✨ New queue created for Elo range {bracket_key * self.bracket_size + 1}-{ (bracket_key + 1) * self.bracket_size } (Key: {bracket_key})")

        # Add player to the queue
        queue = self.queues[bracket_key]
        queue.append(player)
        print(f"-> Player {player['user_id']} (Elo: {elo}) added to queue {bracket_key}. Queue size: {len(queue)}")

        # Check if a match can be made
        if len(queue) >= 2:
            player1 = queue.popleft()
            player2 = queue.popleft()
            
            print(f"✅ Match found in queue {bracket_key}! Pairing {player1['user_id']} and {player2['user_id']}.")

            # If the queue is now empty, delete it to free up memory
            if not queue:
                del self.queues[bracket_key]
                print(f"🗑️ Queue {bracket_key} is empty and has been deleted.")

            return [player1, player2] # Return the new match

        return None # No match was made