import boto3
from dataclasses import dataclass

# Updated Player class
@dataclass
class Player:
    id: str
    elo: int

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('Players')

def get_player(player_id: str) -> Player | None:
    response = table.get_item(Key={'id': player_id})
    item = response.get('Item')

    if not item:
        return None

    return Player(
        id=item['id'],
        elo=item['elo']
    )

def create_player(player: Player):
    table.put_item(
        Item={
            'id': player.id,
            'elo': player.elo
        }
    )

def update_player(player: Player):
    table.update_item(
        Key={'id': player.id},
        UpdateExpression="SET elo = :elo",
        ExpressionAttributeValues={
            ':elo': player.elo
        }
    )
