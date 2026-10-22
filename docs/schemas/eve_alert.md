# Alert Schema

include [Eve Header](./eve_header.md)

| EveField                  | Type   | Optional | DBField        | Example         |
| ------------------------- | ------ | -------- | -------------- | --------------- |
| alert.action              | string | no       | action         | allowed/blocked |
| alert.signature_id        | u32    | no       | signature_id   |                 |
| alert.signature           | string | no       | signature      |                 |
| alert.category            | string | no       | category       |                 |
| alert.severity            | i32    | no       | severity       |                 |
| alert.rule                | string | yes      | rule           |                 |
| alert.xff                 | string | yes      | xff            |                 |
| app_proto                 | string | yes      | app_proto      |                 |
| http.http_method          | string | yes      | http_method    | GET/POST/...    |
| http.url                  | string | yes      | http_url       |                 |
| http.protocol             | string | yes      | http_protocol  |                 |
| http.status               | u16    | yes      | http_status    | 200             |
| http.http_request_header  | string | yes      | http_req_hdr   |                 |
| http.http_response_header | string | yes      | http_resp_hdr  |                 |
| http.http_request_body    | string | yes      | http_req_body  |                 |
| http.http_response_body   | string | yes      | http_resp_body |                 |
| http.http_response_line   | string | yes      | http_resp_line |                 |
| flow.pkts_toserver        | u64    | yes      | ts_pkts        |                 |
| flow.pkts_toclient        | u64    | yes      | tc_pkts        |                 |
| flow.bytes_toserver       | u64    | yes      | ts_bytes       |                 |
| flow.bytes_toclient       | u64    | yes      | tc_bytes       |                 |

## Example

```json
{
  "timestamp": "2026-10-17T14:04:13.566378+0800",
  "flow_id": 1585887868660535,
  "in_iface": "enp89s0",
  "event_type": "alert",
  "src_ip": "172.16.149.128",
  "src_port": 49677,
  "dest_ip": "172.18.2.39",
  "dest_port": 8081,
  "proto": "TCP",
  "ip_v": 4,
  "pkt_src": "wire/pcap",
  "ether": {
    "ether_type": 2048,
    "src_mac": "f4:b7:8d:e5:ac:02",
    "dest_mac": "00:22:93:5a:fd:c1"
  },
  "tx_id": 0,
  "alert": {
    "action": "allowed",
    "gid": 1,
    "signature_id": 2012888,
    "rev": 4,
    "signature": "ET INFO Http Client Body contains pwd= in cleartext",
    "category": "Potential Corporate Privacy Violation",
    "severity": 1
  },
  "ts_progress": "request_complete",
  "tc_progress": "response_complete",
  "http": {
    "hostname": "172.18.2.39",
    "http_port": 8081,
    "url": "/Comm/CheckLogin",
    "http_user_agent": "Mozilla/5.0 (Linux; Android 4.4.4; MC40N0 Build/02-13-12-4AJ22-K-V0-M1-070116) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Mobile Safari/537.36",
    "http_content_type": "application/json",
    "http_method": "POST",
    "protocol": "HTTP/1.1",
    "status": 200,
    "length": 61,
    "http_request_header": "SG9zdDogMTcyLjE4LjIuMzk6ODA4MQpDb25uZWN0aW9uOiBrZWVwLWFsaXZlCkNvbnRlbnQtTGVuZ3RoOiAyNg==",
    "http_response_header": "Q2FjaGUtQ29udHJvbDogcHJpdmF0ZQ0KQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04DQpTZXJ2ZXI6IE1pY3Jvc29mdC1JSVMvNy41DQpYLUFzcE5ldE12Yy1WZXJzaW9uOiAyLjANCkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbjogKg0KQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kczogUFRJT05TLFBPU1QsR0VUDQpBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzOiB4LXJlcXVlc3RlZC13aXRoDQpYLUFzcE5ldC1WZXJzaW9uOiA0LjAuMzAzMTkNClgtUG93ZXJlZC1CeTogQVNQLk5FVA0KRGF0ZTogVHVlLCAyMyBBdWcgMjAyMiAwMTo1NzoyNSBHTVQNCkNvbnRlbnQtTGVuZ3RoOiA2MQ0KDQo=",
    "http_request_body": "dXNlcm5hbWU9eHh4eHh4JnB3ZD14eHh4eHg=",
    "http_response_body": "b2s="
  },
  "app_proto": "http",
  "direction": "to_server",
  "flow": {
    "pkts_toserver": 4,
    "pkts_toclient": 2,
    "bytes_toserver": 770,
    "bytes_toclient": 576,
    "start": "2026-10-17T14:04:13.565851+0800",
    "src_ip": "172.16.149.128",
    "dest_ip": "172.18.2.39",
    "src_port": 49677,
    "dest_port": 8081
  }
}
```
