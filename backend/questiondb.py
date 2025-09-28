from dataclasses import dataclass
from decimal import Decimal
import os
from typing import Any, Dict, List
import boto3

from dotenv import load_dotenv

def convert_floats(value: Any) -> Any:
    """
    Recursively convert floats (or float-like values) to Decimal.
    Works for dicts, lists, tuples, and single values.
    """
    if isinstance(value, float):
        return Decimal(str(value))
    elif isinstance(value, dict):
        return {k: convert_floats(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [convert_floats(v) for v in value]
    elif isinstance(value, tuple):
        return tuple(convert_floats(v) for v in value)
    else:
        return value

@dataclass
class TestCase:
    inputs: Any
    outputs: Any

    @classmethod
    def from_json(cls, data: dict) -> "TestCase":
        return cls(
            inputs=convert_floats(data.get("inputs")),
            outputs=convert_floats(data.get("outputs"))
        )

@dataclass
class Question:
    title: str
    prompt: str
    difficulty: int
    initial_code: Dict[str, str]
    target_func: str
    test_cases: List[TestCase]

    @classmethod
    def from_json(cls, data: dict) -> "Question":
        test_cases_data = data.get("test_cases", [])
        test_cases = [TestCase.from_json(tc) for tc in test_cases_data]
        return cls(
            title=data.get("title", ""),
            prompt=data.get("prompt", ""),
            difficulty=data.get("difficulty", 0),
            initial_code=data.get("initial_code", {}),
            target_func=data.get("target_func", ""),
            test_cases=test_cases
        )

load_dotenv()

dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.getenv("AWS_DEFAULT_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

dynamodb_client = boto3.client(
    'dynamodb',
    region_name=os.getenv("AWS_DEFAULT_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

table = dynamodb.Table('Questions')

def get_question() -> Question | None:
    num_questions = 100
    print(f"Number of questions in DB: {num_questions}")

    # if num_questions == 0:
    #     print("Warning: No questions found in database.")
    #     return None

    # Pick a random primary key
    target_question = random.randint(0, num_questions - 1)

    # Get the question by primary key
    response = table.get_item(Key={'id': target_question})
    item = response.get('Item')
    if not item:
        print("Warning: Question not found in database.")
        return None

    # Convert DynamoDB item to Question object
    question = Question.from_json(item)
    # question.title = item.get('title', '')
    # question.prompt = item.get('prompt', '')
    # question.difficulty = int(item.get('difficulty', 0))
    # question.test_cases = []

    # for tc in item.get('test_cases', []):
    #     test_case = TestCase()
    #     test_case.input = tc.get('input')
    #     test_case.output = tc.get('output')
    #     question.test_cases.append(test_case)

    return question

def add_question(question: Question, i: int):
    """
    Adds a Question object to the DynamoDB Questions table.
    Assigns a new primary key (id) based on current item count.
    """
    # Generate a new primary key (id) based on current number of items
    new_id = ___get_db_item_count()

    # Convert Question object to a dict suitable for DynamoDB
    item = {
        'id': i,
        'title': question.title,
        'prompt': question.prompt,
        'difficulty': question.difficulty,
        'initial_code': question.initial_code,
        'target_func': question.target_func,
        'test_cases': [{'inputs': tc.inputs, 'outputs': tc.outputs} for tc in question.test_cases]
    }

    # Put the item into DynamoDB
    table.put_item(Item=item)

def ___get_db_item_count() -> int:
    response = dynamodb_client.describe_table(TableName="Questions")
    table_info = response['Table']
    
    item_count = table_info['ItemCount']      # Number of items
    
    return item_count