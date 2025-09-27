from questiondb import get_random_question_from_file, get_question

q1 = get_random_question_from_file()
print("FILE:", q1)

q2 = get_question()  # DynamoDB first; falls back to file
print("GET_QUESTION:", q2)
