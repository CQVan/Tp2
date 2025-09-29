import boto3
from dataclasses import dataclass, field

# Updated Player class
@dataclass
class Player:
    id: str
    uuid: str
    elo: int
    password_hash: str = field(repr=False)
    metadata: dict = field(default_factory=dict)

from dotenv import load_dotenv
import os
import boto3

load_dotenv()

dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.getenv("AWS_DEFAULT_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

table = dynamodb.Table('Players')

def get_player(player_id: str) -> Player | None:
    response = table.get_item(Key={'id': player_id})
    item = response.get('Item')

    if not item:
        return None

    return Player(
        uuid="",
        id=item['id'],
        elo=item['elo'],
        password_hash=item['password_hash'],
        metadata={}
    )

def create_player(player: Player):
    table.put_item(
        Item={
            'id': player.id,
            'elo': player.elo,
            'password_hash': player.password_hash
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