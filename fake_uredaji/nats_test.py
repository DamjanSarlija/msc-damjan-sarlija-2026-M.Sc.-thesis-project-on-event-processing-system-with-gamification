import asyncio
from nats.aio.client import Client as NATS

async def main():
    nc = NATS()
    await nc.connect("nats://localhost:4222")

    async def message_handler(msg):
        print(f"Received: {msg.data.decode()}")

    await nc.subscribe("greet", cb=message_handler)

    await nc.publish("greet", b"Hello from Python!")

    await asyncio.sleep(1)

    await nc.close()

asyncio.run(main())