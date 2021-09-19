#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import jwt
import socket
import socketserver
from my_curve import *
from cipher import *
from utils import *
from eclib import *


"""
    Parameters and globals
"""


GAMMA = 2048
ETA = 256
RHO = 120
BS = 8


class SignatureFailure(Exception):
    pass


"""
    Service connection handler
"""


class ForkingTCPServer(socketserver.ForkingTCPServer):
    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        socketserver.TCPServer.server_bind(self)


class ServiceServerHandler(socketserver.BaseRequestHandler):
    def __init__(self, request, client_address, server):
        socketserver.BaseRequestHandler.__init__(self, request, client_address, server)

    def handle(self):
        logger.info('[%s] Accepted connection', self.client_address[0])
        try:
            # handle commands
            while True:
                cmd = read_message(self.request)
                logger.info('[%s] Accepted command: %s', self.client_address[0], cmd)

                if cmd == b'PUSH':
                    logger.info('[%s] PUSH: Executing', self.client_address[0])

                    signature = read_message(self.request)

                    with open('ec_public.pem', 'rb') as jwtkey:
                        key = jwtkey.read()
                    if jwt.decode(signature, key, algorithms='ES256')['message'] != 'It\'s me, Mario!':
                        logger.error('[%s] PUSH: Signature Failure', self.client_address[0])
                        send_message(self.request, b'-')
                        raise SignatureFailure
                    else:
                        send_message(self.request, b'+')

                    # Getting Flag Information
                    capsule = read_message(self.request)
                    logger.info('[%s] PUSH: Capsule: %s', self.client_address[0], capsule)
                    data_id = read_message(self.request)
                    try:
                        key = gen_key_file(GAMMA, ETA, RHO, BS)
                        save_data('db/storage.db', str(data_id), capsule, key)
                        send_message(self.request, b'+')
                    except Exception as ex:
                        send_message(self.request, b'-')
                        logger.error('[%s] PUSH: Exception: %s', self.client_address[0], ex)

                elif cmd == b'PULL':
                    logger.info('[%s] PULL: Executing', self.client_address[0])

                    data_id = read_message(self.request)
                    try:
                        capsule = retrieve_data('db/storage.db', str(data_id))
                        key = retrieve_key('db/storage.db', str(data_id))
                        p, params = read_key_file(key)
                        encrypted_capsule = encrypt(capsule, None, p, params)
                        send_message(self.request, encrypted_capsule)
                    except Exception as ex:
                        send_message(self.request, b'-')
                        logger.error('[%s] PUSH: Exception: %s', self.client_address[0], ex)

                elif cmd == b'GET_KEY':
                    logger.info('[%s] GET_KEY: Executing', self.client_address[0])

                    data_id = read_message(self.request)

                    # Authentication
                    password = 3505712888173042691322191765128383093456642552336387650112414960684
                    # 1
                    compressed_g = G.compress()
                    send_message(self.request, compressed_g)

                    # 2
                    s_2 = 704851267790263771131628366796140963248831621530383017014295664069
                    s_3 = 14643833835020137108846319043374370382474237984829820464401091908622
                    G_2s = s_2 * G
                    G_3s = s_3 * G

                    compressed_g2c = read_message(self.request)
                    compressed_g3c = read_message(self.request)
                    G_2c = decompress(compressed_g2c, E)
                    G_3c = decompress(compressed_g3c, E)

                    # 3
                    send_message(self.request, G_2s.compress())
                    send_message(self.request, G_3s.compress())

                    G_2 = s_2 * G_2c
                    G_3 = s_3 * G_3c
                    s = 5533087440354968231892251036145507694476249573723734950616120199171
                    P_s = s * G_3
                    Q_s = s * G + password * G_2

                    compressed_pc = read_message(self.request)
                    compressed_qc = read_message(self.request)
                    P_c = decompress(compressed_pc, E)
                    Q_c = decompress(compressed_qc, E)

                    # 4
                    send_message(self.request, P_s.compress())
                    send_message(self.request, Q_s.compress())

                    R_s = s_3 * (Q_s - Q_c)

                    compressed_rc = read_message(self.request)
                    R_c = decompress(compressed_rc, E)

                    # 5
                    send_message(self.request, R_s.compress())

                    R_sc = s_3 * R_c

                    if R_sc == P_s - P_c:
                        logger.info('[%s] GET_KEY: Successful authentication', self.client_address[0])
                        send_message(self.request, b'+')
                        try:
                            key = retrieve_key('db/storage.db', str(data_id))
                            send_message(self.request, key)
                        except Exception as ex:
                            logger.error('[%s] GET_KEY: Exception: %s', self.client_address[0], ex)
                            send_message(self.request, b'-')
                    else:
                        logger.info('[%s] GET_KEY: Failed authentication', self.client_address[0])
                        send_message(self.request, b'-')

                elif cmd == b'EXIT':
                    send_message(self.request, b'+')
                    break

                else:
                    raise Exception('[%s] Failed to process command: command %s is unknown', self.client_address[0], cmd)

        except Exception as ex:
            logger.error(str(ex), exc_info=True)

        finally:
            logger.info('[%s] Processed connection', self.client_address[0])


"""
    main
"""

if __name__ == '__main__':
    # initialize logging
    logging.basicConfig(format='%(asctime)s [%(levelname)-5.5s]  %(message)s',
                        datefmt='%Y-%m-%d %H:%M:%S',
                        level=logging.DEBUG)
    logger = logging.getLogger('service')

    # initialize and spawn the server
    create_database('db/storage.db')
    server = ForkingTCPServer(('0.0.0.0',  8777), ServiceServerHandler)
    server.serve_forever()
