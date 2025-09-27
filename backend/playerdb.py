
class Player:
    name: str
    uuid: str
    elo: int

def get_player() -> Player:
    return Player("test", "uuid-here", 400)

def create_player(player: Player):
    return

def update_player(player: Player):
    return