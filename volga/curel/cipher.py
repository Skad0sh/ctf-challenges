#!/usr/bin/python3.8
# -*- coding: utf-8 -*-
import argparse
import base64
import os
import random
import re
from io import BytesIO

import gmpy2

SIZE_BYTE_LENGTH = 4


# region Utils

def gen_random_mpz(lbound, rbound):
    seed = random.randrange(2**42)
    v = gmpy2.mpz_random(gmpy2.random_state(seed), rbound - lbound) + lbound
    return v


def gen_prime_mpz(lbound, rbound):
    p = gen_random_mpz(lbound, rbound) | 1
    while not gmpy2.is_bpsw_prp(p):
        p = gen_random_mpz(lbound, rbound) | 1
    return p


def bytes_to_mpz(b):
    return gmpy2.mpz(int.from_bytes(b, byteorder='little', signed=False))


def mpz_to_bytes(a, length):
    if length is None:
        length = (a.bit_length() + 7) // 8
    return int(abs(a)).to_bytes(length=length, byteorder='little', signed=False)


def write_mpz(a, f=None):
    b = int(abs(a)).to_bytes(length=(a.bit_length() + 7) // 8, byteorder='little', signed=False)
    b = len(b).to_bytes(length=SIZE_BYTE_LENGTH, byteorder='little', signed=False) \
        + (b'\x01' if a >= 0 else b'\xff') + b
    if f is not None:
        f.write(b)
    return b


def read_mpz(f):
    lb = f.read(SIZE_BYTE_LENGTH)
    if lb == b'' or len(lb) != SIZE_BYTE_LENGTH:
        return None
    length = int.from_bytes(lb, byteorder='little', signed=False)
    sign = f.read(1)
    b = f.read(length)
    if b == b'' or len(b) != length:
        return None
    return gmpy2.mpz(ord(sign) * int.from_bytes(b, byteorder='little', signed=False))

# endregion Utils


# region Key-related functions

def gen_key_file(gamma: int, eta: int, rho: int, block_size: int) -> bytes:
    p = gen_prime_mpz(lbound=2**(eta-1), rbound=2**eta)
    b = write_mpz(p) + \
        write_mpz(gmpy2.mpz(gamma)) + write_mpz(gmpy2.mpz(eta)) + write_mpz(gmpy2.mpz(rho)) + \
        write_mpz(gmpy2.mpz(block_size))
    s = '-----BEGIN KEY-----\n{0}\n------END KEY------'.format(base64.standard_b64encode(b).decode())

    return s.encode()


def read_key_file(key: bytes):
    try:
        m = re.compile(r'-----BEGIN KEY-----\s+'
                       r'((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4}))'
                       r'\s+------END KEY------').match(key.decode("utf-8"))
        b = BytesIO(base64.standard_b64decode(m.group(1)))
        p = read_mpz(b)
        gamma = read_mpz(b)
        eta = read_mpz(b)
        rho = read_mpz(b)
        block_size = read_mpz(b)
    except Exception:
        raise ValueError('Incorrect key file format')
    return p, (gamma, eta, rho, block_size)

# endregion Key-related functions


# region The Cipher

def encrypt_block(m, bs, p, gamma, eta, rho):
    assert bs >= m.bit_length()
    r = gen_random_mpz(-2**(rho-bs) + 1, 2**(rho-bs))
    q = gen_random_mpz(0, 2**(gamma - eta))
    c = q*p + r*2**bs + m
    return c


def decrypt_block(c, bs, p):
    res = c % p
    c = res - p if res > p / 2 else res
    res = c % 2**bs
    m = res if res >= 0 else 2**bs + res
    return m


def encrypt(input_data, output, p, params):
    # 1. make sure fin and fout are IO objects
    if type(input_data) is bytes:
        fin = BytesIO(input_data)
    elif type(input_data) is str:
        fin = open(input_data, 'rb')
    else:
        raise ValueError('input_data must be either str or bytes, but %s is given' % type(input_data))

    ret_as_bytes = False
    if output is None:
        fout = BytesIO()
        ret_as_bytes = True
    elif type(output) is str:
        fout = open(output, 'wb')
    else:
        raise ValueError('output must be either str or None type, but %s is given' % type(output))

    # 2. encrypt the data block-by-block and write to the output IO buffer
    gamma, eta, rho, block_size = params
    bs = block_size * 8
    while True:
        mb = fin.read(int(block_size))
        if len(mb) < block_size:
            # N.B: we've reached the end of the stream and need to pad the data
            break
        m = bytes_to_mpz(mb)
        c = encrypt_block(m, bs, p, gamma, eta, rho)
        write_mpz(c, f=fout)

    # 3. pad the last block of the data and encrypt it
    #    N.B. padding is only required if the block size is greater than 1 (that is, if we actually use blocks)
    if block_size > 1:
        mb = mb + b'\x80' + b'\x00' * (block_size - len(mb) - 1)
        m = bytes_to_mpz(mb)
        c = encrypt_block(m, bs, p, gamma, eta, rho)
        write_mpz(c, f=fout)

    # 4. return bytes if fout wasn't a file path
    if ret_as_bytes:
        fout.seek(0, os.SEEK_SET)
        fout = fout.read()
    return fout


def decrypt(input_data, output, p, params):
    # 1. make sure fin and fout are IO objects
    if type(input_data) is bytes:
        fin = BytesIO(input_data)
    elif type(input_data) is str:
        fin = open(input_data, 'rb')
    else:
        raise ValueError('input_data must be either str or bytes, but %s is given' % type(input_data))

    ret_as_bytes = False
    if output is None:
        fout = BytesIO()
        ret_as_bytes = True
    elif type(output) is str:
        fout = open(output, 'wb+')
    else:
        raise ValueError('output must be either str or None type, but %s is given' % type(output))

    # 2. decrypt the data block-by-block and write to the output IO buffer
    _, _, _, block_size = params
    bs = block_size * 8
    while True:
        c = read_mpz(f=fin)
        if c is None:
            break
        m = decrypt_block(c, bs, p)
        mb = mpz_to_bytes(m, length=block_size)
        fout.write(mb)

    # 3. strip the padding
    #    N.B. similarly, string is only required if we actually use blocks
    if block_size > 1:
        pos = -1
        while True:
            fout.seek(pos, os.SEEK_END)
            b = fout.read(1)
            if b == b'\x80':
                break
            pos -= 1
        fout.seek(pos, os.SEEK_END)
        fout.truncate()

    # 4. return bytes if fout wasn't a file path
    if ret_as_bytes:
        fout.seek(0, os.SEEK_SET)
        fout = fout.read()
    return fout

# endregion The Cipher


if __name__ == '__main__':
    # 1. parse input arguments
    parser = argparse.ArgumentParser()

    subparsers = parser.add_subparsers(dest='cmd', required=True)
    parser_key = subparsers.add_parser('genkey', help='Generate encryption key file')
    parser_key.add_argument('key_file_path', type=str, help='Path to output key file')
    parser_key.add_argument('-g', '--gamma', type=int, default=4000, help='gamma')
    parser_key.add_argument('-e', '--eta', type=int, default=211, help='eta')
    parser_key.add_argument('-r', '--rho', type=int, default=160, help='rho')
    parser_key.add_argument('-b', '--block-size', type=int, default=8, help='Block size')

    parser_encrypt = subparsers.add_parser('encrypt', help='Encrypt data')
    parser_encrypt.add_argument('input', type=str, help='Path to the input file')
    parser_encrypt.add_argument('output', type=str, help='Path to the output file')
    parser_encrypt.add_argument('key_file_path', type=str, help='Path to the key file')

    parser_decrypt = subparsers.add_parser('decrypt', help='Decrypt data')
    parser_decrypt.add_argument('input', type=str, help='Path to the input file')
    parser_decrypt.add_argument('output', type=str, help='Path to the output file')
    parser_decrypt.add_argument('key_file_path', type=str, help='Path to the key file')

    args = parser.parse_args()

    # 2. execute the command
    if args.cmd == 'genkey':
        gen_key_file(args.key_file_path, args.gamma, args.eta, args.rho, args.block_size)

    elif args.cmd == 'encrypt':
        p, params = read_key_file(args.key_file_path)
        encrypt(args.input, args.output, p, params)

    elif args.cmd == 'decrypt':
        p, params = read_key_file(args.key_file_path)
        decrypt(args.input, args.output, p, params)

    pass
