import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import String
from cv_bridge import CvBridge
import cv2
import numpy as np
import face_recognition
import json
import requests
import base64

class FaceDetectionNode(Node):
    def __init__(self):
        super().__init__('face_detection_node')
        
        # Parameters
        self.declare_parameter('camera_topic', '/camera/image_raw')
        self.declare_parameter('api_endpoint', 'http://localhost:5000/api/attendance/mark')
        
        # Get parameters
        self.camera_topic = self.get_parameter('camera_topic').value
        self.api_endpoint = self.get_parameter('api_endpoint').value
        
        # Create subscribers
        self.image_subscription = self.create_subscription(
            Image,
            self.camera_topic,
            self.image_callback,
            10)
        
        # Create publishers
        self.attendance_publisher = self.create_publisher(
            String,
            'attendance_events',
            10)
        
        # Initialize CV bridge
        self.bridge = CvBridge()
        
        # Initialize face detection variables
        self.face_detection_active = False
        self.last_detection_time = self.get_clock().now()
        self.min_detection_interval = 5.0  # Seconds
        
        self.get_logger().info('Face Detection Node started')
    
    def image_callback(self, msg):
        # Check if enough time has passed since last detection
        current_time = self.get_clock().now()
        time_diff = (current_time - self.last_detection_time).nanoseconds / 1e9
        
        if time_diff < self.min_detection_interval:
            return
        
        try:
            # Convert ROS Image message to OpenCV image
            cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
            
            # Convert to RGB for face_recognition library
            rgb_image = cv2.cvtColor(cv_image, cv2.COLOR_BGR2RGB)
            
            # Detect faces in the image
            face_locations = face_recognition.face_locations(rgb_image)
            
            if face_locations:
                self.get_logger().info(f'Detected {len(face_locations)} faces')
                
                # Process the first face detected
                top, right, bottom, left = face_locations[0]
                
                # Extract face image
                face_image = rgb_image[top:bottom, left:right]
                
                # Convert face image to JPEG
                _, jpeg_image = cv2.imencode('.jpg', cv2.cvtColor(face_image, cv2.COLOR_RGB2BGR))
                
                # Send to API for recognition
                self.send_face_to_api(jpeg_image.tobytes())
                
                # Update last detection time
                self.last_detection_time = current_time
        
        except Exception as e:
            self.get_logger().error(f'Error processing image: {str(e)}')
    
    def send_face_to_api(self, image_bytes):
        try:
            # Convert image bytes to base64 for HTTP transfer
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Create multipart form data
            files = {
                'faceImage': ('face.jpg', image_bytes, 'image/jpeg')
            }
            
            # Send request to API
            response = requests.post(self.api_endpoint, files=files)
            
            if response.status_code == 201:  # Created
                result = response.json()
                
                # Publish attendance event
                event_msg = String()
                event_msg.data = json.dumps({
                    'event': 'attendance_marked',
                    'student': {
                        'id': result['student']['_id'],
                        'name': result['student']['name'],
                        'registrationNumber': result['student']['registrationNumber']
                    },
                    'timestamp': self.get_clock().now().to_msg().sec
                })
                
                self.attendance_publisher.publish(event_msg)
                self.get_logger().info(f"Attendance marked for {result['student']['name']}")
            else:
                self.get_logger().warn(f"API request failed: {response.status_code} - {response.text}")
        
        except Exception as e:
            self.get_logger().error(f'Error sending face to API: {str(e)}')

def main(args=None):
    rclpy.init(args=args)
    
    node = FaceDetectionNode()
    
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()