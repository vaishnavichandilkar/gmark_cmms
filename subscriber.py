import paho.mqtt.client as mqtt
import logging
import sys

# Configure logging to print beautifully to the console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# --- Configuration ---
BROKER = "mqtt.gmarksoftware.com"
PORT = 1883
USERNAME = "admin"
PASSWORD = "admin123"
TOPIC = "#"  # Subscribe to all topics

def on_connect(client, userdata, flags, reason_code, properties=None):
    """Callback for when the client connects to the broker."""
    if reason_code == 0:
        logger.info(f"Successfully connected to MQTT broker at {BROKER}:{PORT}")
        # Subscribing in on_connect ensures subscriptions are renewed if the connection drops and reconnects
        client.subscribe(TOPIC)
        logger.info(f"Subscribed to all topics using wildcard: '{TOPIC}'")
    else:
        logger.error(f"Failed to connect. Reason code: {reason_code}")

def on_message(client, userdata, msg):
    """Callback for when a PUBLISH message is received from the server."""
    try:
        # Try to decode the payload as UTF-8
        payload = msg.payload.decode('utf-8')
        
        # Prominently display the received data
        print(f"\n{'='*50}")
        print(f"📡 NEW MESSAGE RECEIVED")
        print(f"{'='*50}")
        print(f"📍 Topic: {msg.topic}")
        print(f"📦 Data:  {payload}")
        print(f"{'='*50}\n")
        
        # Also keep it in the logs
        logger.info(f"Message logged on topic {msg.topic}")
    except UnicodeDecodeError:
        # Fallback to raw bytes if the payload is not valid UTF-8
        print(f"\n{'='*50}")
        print(f"📡 NEW RAW MESSAGE RECEIVED")
        print(f"{'='*50}")
        print(f"📍 Topic: {msg.topic}")
        print(f"📦 Data:  {msg.payload}")
        print(f"{'='*50}\n")
        
        logger.info(f"Raw message logged on topic {msg.topic}")
    except Exception as e:
        logger.error(f"Error processing message on topic {msg.topic}: {e}")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    """Callback for when the client disconnects from the broker."""
    if reason_code != 0:
        logger.warning(f"Unexpected disconnection. Reason code: {reason_code}")
    else:
        logger.info("Disconnected from MQTT broker gracefully.")

def main():
    # Create an MQTT client instance
    # We use CallbackAPIVersion.VERSION2 as it is the standard for paho-mqtt 2.0.0 and above
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        logger.error("Please upgrade your paho-mqtt library to version 2.0.0 or above.")
        sys.exit(1)

    # Set authentication credentials
    client.username_pw_set(USERNAME, PASSWORD)

    # Attach the callback functions
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect

    try:
        logger.info(f"Attempting to connect to {BROKER}:{PORT}...")
        # Connect to the broker (keepalive is 60 seconds)
        client.connect(BROKER, PORT, 60)
        
        # Start the network loop to process incoming and outgoing messages
        # loop_forever() is a blocking call that handles reconnects automatically
        client.loop_forever()
        
    except KeyboardInterrupt:
        # Handle graceful shutdown when the user presses Ctrl+C
        logger.info("Script terminated by user (KeyboardInterrupt).")
        client.disconnect()
        sys.exit(0)
    except Exception as e:
        logger.error(f"An unexpected error occurred during connection: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
