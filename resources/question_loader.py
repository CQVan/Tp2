import json

from questiondb import Question, add_question

with open("./question.json", "r") as file:
    data = json.load(file)
    i = 0
    for obj in data:
        question = Question.from_json(obj)
        add_question(question, i)
        i += 1

