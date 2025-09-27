from typing import Any, List
import boto3
import random

class TestCase:
    input: Any
    output: Any

class Question:
    title: str
    prompt : str
    difficulty: int
    test_cases: List[TestCase]

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
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

def ___get_db_item_count() -> int:
    response = dynamodb.describe_table(TableName="Questions")
    table_info = response['Table']
    
    item_count = table_info['ItemCount']      # Number of items
    
    return item_count