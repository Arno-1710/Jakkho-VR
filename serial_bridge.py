import serial
import socket
import sys

PORT = 'COM5'
BAUD = 115200
UDP_IP = '127.0.0.1'
UDP_PORT = 8888

print(f'[JAKKHO Bridge] Opening {PORT} at {BAUD} baud...')
try:
    ser = serial.Serial(PORT, BAUD, timeout=1)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    print(f'[JAKKHO Bridge] Connected to ESP32 on {PORT}!')
    print(f'[JAKKHO Bridge] Forwarding telemetry packets to Unity at {UDP_IP}:{UDP_PORT}')
    print('Press Ctrl+C to stop.\n')

    while True:
        data = ser.read(20)
        if len(data) >= 20:
            sock.sendto(data, (UDP_IP, UDP_PORT))
except serial.SerialException as e:
    print(f'[JAKKHO Bridge Error] {e}')
    print(f'Make sure COM5 is not open in Arduino Serial Monitor.')
except KeyboardInterrupt:
    print('\n[JAKKHO Bridge] Stopped.')
