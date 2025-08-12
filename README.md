### use genezio
```bash
npm install genezio -g
genezio login <access_token>

```
### local server
```bash
genezio local --env .env
```
.env를 가져옵니다
server의 경우 여러개일때도, /server/.env 로 위치 주었음

```bash
✔ Running backend local scripts
[dotenv@17.2.1] injecting env (1) from .env -- tip: 📡 observe env with Radar: https://dotenvx.com/radar
[dotenv@17.2.1] injecting env (4) from server/.env -- tip: 📡 version env with Radar: https://dotenvx.com/radar
[dotenv@17.2.1] injecting env (0) from server/.env -- tip: 🔐 prevent committing .env to code: https://dotenvx.com/precommit
Server listening on port 8083
%s Your local server is running and the SDK was successfully generated!

Functions Deployed:
  - function-agent: http://localhost:61770
  - function-executor: http://localhost:61771

Server is running on port 3000
Server is running on port 3001
[Frontend logs, path: client]
| > client@0.0.0 dev
| > vite
|
|
|   VITE v7.0.6  ready in 140 ms
|
|   ➜  Local:   http://localhost:5173/
|   ➜  Network: use --host to expose
```

### deploy
```bash
genezio deploy
```
deploy시에 필요한 .env는 자동으로 inject 합니다.
```bash
injecting env (0) from server/.env
```
그렇지 않고, 갱신되는 .env 같은 경우는 
genezio.yaml에서 치환값으로 명시해줍니다.
```bash
  environment:
    EXECUTOR_URL: ${{backend.functions.executor.url}}
```