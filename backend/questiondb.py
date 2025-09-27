from typing import Any, List

class TestCase:
    input: Any
    output: Any

class Question:
    prompt : str
    test_cases: List[TestCase]


def get_question():
    return