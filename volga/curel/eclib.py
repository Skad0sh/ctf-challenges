#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import base64
import math
# from gmpy2 import invert


class EllipticCurve(object):
    def __init__(self, curve):
        self.a = curve[0]
        self.b = curve[1]
        self.p = curve[2]
        self.discriminant = -16 * (4 * self.a**3 + 27 * self.b**2)
        if not self._is_smooth():
            raise Exception("The curve %s is not smooth!" % self)

    def _is_smooth(self):
        return self.discriminant != 0

    def on_curve(self, x, y, p):
        return (y**2) % p == (x**3 + self.a * x + self.b) % p

    def __str__(self):
        return 'y^2 = x^3 + %Gx + %G (mod %G)' % (self.a, self.b, self.p)

    def __eq__(self, other):
        return (self.a, self.b, self.p) == (other.a, other.b, other.p)


class Point(object):
    def __init__(self, curve, x, y):
        self.curve = curve
        self.x = x
        self.y = y
        if not curve.on_curve(x, y, curve.p):
            raise Exception("The point %s is not on the given curve %s" % (self, curve))

    def __neg__(self):
        return Point(self.curve, self.x, self.curve.p - self.y)

    def __add__(self, Q):
        if isinstance(Q, Ideal):
            return self
        if isinstance(self, Ideal):
            return Q
        x_1, y_1, x_2, y_2 = self.x, self.y, Q.x, Q.y
        if (x_1 == x_2) and (y_1 == self.curve.p - y_2):
            return Ideal(self.curve)
        if (x_1, y_1) == (x_2, y_2):
            if y_1 == 0:
                return Ideal(self.curve)
            else:
                s = (3 * x_1 * x_1 + self.curve.a) * int(invert(2 * y_1, self.curve.p))
        else:
            s = (y_1 - y_2) * int(invert(x_1 - x_2, self.curve.p))
        x_3 = (s*s - x_2 - x_1) % self.curve.p
        y_3 = (s*(x_1 - x_3) - y_1) % self.curve.p

        return Point(self.curve, x_3, y_3)

    def __sub__(self, Q):
        return self + -Q

    def __mul__(self, n):
        if not isinstance(n, int):
            raise Exception("Can't scale a point by something which isn't an int!")
        else:
            if n < 0:
                return -self * -n
            if n == 0:
                return Ideal(self.curve)
            else:
                R = Ideal(self.curve)
                Q = self
                while n:
                    if n & 1:
                        R = R + Q
                    Q = Q + Q
                    n >>= 1
        return R

    def __rmul__(self, n):
        return self * n

    def __str__(self):
        return "({0}, {1})".format(self.x, self.y)

    def __eq__(self, other):
        return (self.x, self.y, self.curve) == (other.x, other.y, other.curve)

    def compress(self):
        if isinstance(self, Ideal):
            return base64.b64encode(b'\x00' * 16)
        x = int_to_bytes(self.x)
        y = self.y % 2
        if y:
            return base64.b64encode(b'\x03' + x)
        return base64.b64encode(b'\x02' + x)


class Ideal(Point):
    def __init__(self, curve):
        self.curve = curve
        self.x = math.inf
        self.y = math.inf

    def __str__(self):
        return "Ideal"

    def __neg__(self):
        return self

    def __add__(self, Q):
        return Q

    def __mul__(self, n):
        if not isinstance(n, int):
            raise Exception("Can't scale a point by something which isn't an int!")
        else:
            return self


def bytes_to_int(s: bytes) -> int:
    return int.from_bytes(s, 'big')


def int_to_bytes(number: int) -> bytes:
    length = number.bit_length()
    return number.to_bytes(length // 8 + int(length % 8 > 0), 'big')


def modular_sqrt(a: int, p: int) -> int:
    if legendre_symbol(a, p) != 1:
        return 0
    elif a == 0:
        return 0
    elif p == 2:
        return p
    elif p % 4 == 3:
        return pow(a, (p + 1) // 4, p)
    s = p - 1
    e = 0
    while s % 2 == 0:
        s //= 2
        e += 1
    n = 2
    while legendre_symbol(n, p) != -1:
        n += 1
    x = pow(a, (s + 1) // 2, p)
    b = pow(a, s, p)
    g = pow(n, s, p)
    r = e
    while True:
        t = b
        m = 0
        for m in range(r):
            if t == 1:
                break
            t = pow(t, 2, p)
        if m == 0:
            return x
        gs = pow(g, 2 ** (r - m - 1), p)
        g = (gs * gs) % p
        x = (x * gs) % p
        b = (b * g) % p
        r = m


def legendre_symbol(a: int, p: int) -> int:
    ls = pow(a, (p - 1) // 2, p)
    return -1 if ls == p - 1 else ls


def decompress(point: bytes, curve):
    point = base64.b64decode(point)
    x = bytes_to_int(point[1:])
    if point[0] == 0:
        return Ideal(curve)
    if point[0] == 3:
        yp = 1
    if point[0] == 2:
        yp = 0
    a = (x**3 + curve.a * x + curve.b) % curve.p
    y = modular_sqrt(a, curve.p)
    if y % 2 == yp:
        return Point(curve, x, y)
    else:
        return Point(curve, x, curve.p - y)


def egcd(a, b):
    if a == 0:
        return (b, 0, 1)
    else:
        g, y, x = egcd(b % a, a)
        return (g, x - (b // a) * y, y)


def invert(a, m):
    a = a % m
    g, x, y = egcd(a, m)
    if g != 1:
        raise Exception('modular inverse does not exist')
    else:
        return x % m


if __name__ == '__main__':
    p = 0xb0708ff67404c76391815427892fc26f
    a = 0xa4c56bfa1267f1f1a08223b7d162da8b
    b = 0x80575d3894c7ae6b17534441ef0b67be
    order = 0xb0708ff67404c7635a498053bbaad62e
    Gx = 0x4a1c7d35b50beac90194b298fefbbb6d
    Gy = 0x2c51750b966abed8d00cac3e9ca21c0d
    sec_curve = EllipticCurve([a, b, p])
    G = Point(sec_curve, Gx, Gy)
    comp_point = G.compress()
    print(5 * G)
    print(G)
    print(decompress(comp_point, sec_curve))
