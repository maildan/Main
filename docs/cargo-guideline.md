1. cargo build를 이행할 시 cd src-tauri를 하여 위치를 변경시킨 이후 cargo build를 한다.
2. 빌드를 성공적으로 마친 이후에는 cd ..를 하여 위치를 변경시킨 이후 yarn run dev를 한다.
3. **⚠️ 중요: cargo build나 yarn run dev를 이행할 시 절대로 && 을 사용하여 연결하지 않는다.**
4. **⚠️ 경고: 어느 코드 구문이던지 간에 && 연산자를 사용하여 연결하지 않는다. 이는 PowerShell에서 오류를 발생시킨다.**
**옳은 예:** cd src tauri -> cargo build, cd .. -> yarn run dev
**틀린 예:** cd src tauri && cargo build, cd .. && yarn run dev
5. 코드의 줄이 500줄 이상이 되면 파일을 따로 분화시킨다.
6. tauri 코드를 생성할 때에는 Tauri V2 공식문서를 이용한다. (https://v2.tauri.app/start/)
7. ** 요구사항 이행 전에 Loop디렉터리를 먼저 읽고 전체 구조 파악 바람. **
8. 터미널 명령을 이행시 현재 위치는 이미 D:\Codes\Loop>이니 따로 cd를 하여 옮길 필요 없음
9. copilot에서 터미널 명령어 이행 후 반복루프에 빠지는것을 방지하기 위해 터미널에 명령어 작성 이후 ctrl + c를 하여 루프 탈출 요함.