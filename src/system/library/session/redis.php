<?php
namespace Session;
class Redis {
    private $redis;
    private $expire;

    public function __construct($registry) {
        $this->expire = ini_get('session.gc_maxlifetime');
        // Ensure we are using the global PHP Redis class
        if (class_exists('\Redis')) {
            $this->redis = new \Redis();
            try {
                // 'redis' matches your service name in docker-compose.yml
                $this->redis->connect(REDIS_HOSTNAME, REDIS_PORT, REDIS_TIMEOUT);
            } catch (\Exception $e) {
                $registry->get('log')->write('Redis connection error: ' . $e->getMessage());
            }
        } else {
            $registry->get('log')->write('Error: Redis extension not found in PHP-FPM container.');
        }
    }

    public function read($session_id) {
        $data = $this->redis->get('session:' . $session_id);

        if ($data) {
            return json_decode($data, true);
        } else {
            return array();
        }
    }

    public function write($session_id, $data) {
        if ($this->redis && $data) {
            return $this->redis->setex('session:' . $session_id, $this->expire, json_encode($data));
        }
        return false;
    }

    public function destroy($session_id) {
        return $this->redis ? $this->redis->del('session:' . $session_id) : false;
    }

    public function __destruct() {
        if ($this->redis) {
            $this->redis->close();
        }
    }
}