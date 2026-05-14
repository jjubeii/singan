result = (i for i in range(10))
print(result)
result2 = result
print(result2)
for _ in result:
    print(_)
for _ in result2:
    print(_)
print(type(print))