import string
out = []
for i in string.printable:
    for j in string.printable:
        if(i==j):
            continue
        if(chr(ord(i)^ord(j))=="`"):
            out.append("FOUND {}:{}".format(i,j))
for i in out:
    print(i)