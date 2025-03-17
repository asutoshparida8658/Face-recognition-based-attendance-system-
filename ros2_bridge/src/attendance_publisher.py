import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import requests
from datetime import datetime

class AttendancePublisherNode(Node):
    def __init__(self):
        super().__init__('attendance_publisher_node')
        
        # Parameters
        self.declare_parameter('api_endpoint', 'http://localhost:5000/api/attendance/stats')
        self.declare_parameter('publish_rate', 60.0)  # seconds
        
        # Get parameters
        self.api_endpoint = self.get_parameter('api_endpoint').value
        self.publish_rate = self.get_parameter('publish_rate').value
        
        # Create publishers
        self.stats_publisher = self.create_publisher(
            String,
            'attendance_statistics',
            10)
        
        # Create timer for periodic publishing
        self.timer = self.create_timer(self.publish_rate, self.publish_stats)
        
        self.get_logger().info('Attendance Publisher Node started')
    
    def publish_stats(self):
        try:
            # Get attendance statistics from API
            response = requests.get(self.api_endpoint)
            
            if response.status_code == 200:
                stats = response.json()
                
                # Create summary
                summary = {
                    'timestamp': datetime.now().isoformat(),
                    'totalStudents': len(set(stat['student'] for stat in stats)),
                    'averageAttendance': sum(stat['presentPercentage'] for stat in stats) / len(stats) if stats else 0,
                    'belowThreshold': sum(1 for stat in stats if stat['presentPercentage'] < 75),
                    'topPerformers': sorted(
                        [{'name': stat['studentName'], 'attendance': stat['presentPercentage']} 
                         for stat in stats],
                        key=lambda x: x['attendance'],
                        reverse=True
                    )[:5]
                }
                
                # Publish statistics
                msg = String()
                msg.data = json.dumps(summary)
                self.stats_publisher.publish(msg)
                
                self.get_logger().info('Published attendance statistics')
            else:
                self.get_logger().warn(f"API request failed: {response.status_code} - {response.text}")
        
        except Exception as e:
            self.get_logger().error(f'Error publishing statistics: {str(e)}')

def main(args=None):
    rclpy.init(args=args)
    
    node = AttendancePublisherNode()
    
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()