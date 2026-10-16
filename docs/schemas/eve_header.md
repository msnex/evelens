# Eve Header Schema

| EveField       | Type   | Optional | DBField    | Example                         |
| -------------- | ------ | -------- | ---------- | ------------------------------- |
| timestamp      | string | no       | timestamp  | 2026-10-15T18:40:11.094810+0800 |
| flow_id        | u64    | yes      | flow_id    | 967932416392242                 |
| parent_id      | u64    | yes      | parent_id  | 2233811517062488                |
| in_iface       | string | yes      | in_iface   | enp89s0                         |
| event_type     | string | no       | event_type | alert/http/arp/...              |
| vlan           | array  | yes      | vlan       | [12, 31, 0]                     |
| src_ip         | string | yes      | src_ip     |                                 |
| src_port       | u16    | yes      | src_port   |                                 |
| dest_ip        | string | yes      | dst_ip     |                                 |
| dest_port      | u16    | yes      | dst_port   |                                 |
| proto          | string | yes      | proto      | TCP/UDP/...                     |
| ip_v           | u8     | yes      | -          | 4/6                             |
| icmp_type      | u8     | yes      | icmp_type  |                                 |
| icmp_code      | u8     | yes      | icmp_code  |                                 |
| pkt_src        | string | no       | pkt_src    | gre tunnel/ipv4 tunnel/...      |
| ether.src_mac  | string | yes      | src_mac    | f4:b7:8c:e5:ae:01               |
| ether.dest_mac | string | yes      | dst_mac    | 00:21:91:5d:fc:c2               |
| tx_id          | u64    | yes      | tx_id      | 0                               |
| host           | string | yes      | host       |                                 |
