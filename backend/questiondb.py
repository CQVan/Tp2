from dataclasses import dataclass
import os
from typing import Any, Dict, List
import boto3
import random

from dotenv import load_dotenv

@dataclass
class TestCase:
    input: Any
    output: Any

    @classmethod
    def from_json(cls, data: dict) -> "TestCase":
        return cls(
            input=data.get("input"),
            output=data.get("output")
        )

@dataclass
class Question:
    title: str
    prompt: str
    difficulty: int
    inital_code: Dict[str, str]
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
            inital_code=data.get("inital_code", {}),
            target_func=data.get("target_func", ""),
            test_cases=test_cases
        )

    @classmethod
    def from_json(cls, data: dict) -> "Question":
        test_cases_data = data.get("test_cases", [])
        test_cases = [TestCase.from_json(tc) for tc in test_cases_data]
        return cls(
            title=data.get("title", ""),
            prompt=data.get("prompt", ""),
            difficulty=data.get("difficulty", 0),
            inital_code=data.get("inital_code", {}),
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
    num_questions = ___get_db_item_count()
    if num_questions == 0:
        return None

    # Pick a random primary key
    target_question = random.randint(0, num_questions - 1)

    # Get the question by primary key
    response = table.get_item(Key={'id': target_question})
    item = response.get('Item')
    if not item:
        return None

    # Convert DynamoDB item to Question object
    question = Question()
    question.title = item.get('title', '')
    question.prompt = item.get('prompt', '')
    question.difficulty = int(item.get('difficulty', 0))
    question.test_cases = []

    for tc in item.get('test_cases', []):
        test_case = TestCase()
        test_case.input = tc.get('input')
        test_case.output = tc.get('output')
        question.test_cases.append(test_case)

    return question

def add_question(question : Question):
    pass

def ___get_db_item_count() -> int:
    response = dynamodb_client.describe_table(TableName="Questions")
    table_info = response['Table']
    
    item_count = table_info['ItemCount']      # Number of items
    
    return item_count