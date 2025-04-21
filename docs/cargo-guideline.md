1. cargo build를 이행할 시 cd src-tauri를 하여 위치를 변경시킨 이후 cargo build를 한다.
2. 빌드를 성공적으로 마친 이후에는 cd ..를 하여 위치를 변경시킨 이후 npm run tauri dev를 한다.
3. cargo build나 npm run tauri dev를 이행할 시 절대로 && 을 사용하여 연결하지 않는다.
4. 어느 코드 구문이던지 간에 && 연산자를 사용하여 연결하지 않는다.
5. 오류를 해결하거나 새로운 코드에 대한 요구사항을 이행한 후에는 애플리케이션의 작동여부를 확인하기 위하여 1번과 2번을 수행한다.
옳은 예: cd src tauri -> cargo build, cd .. -> npm run tauri dev
틀린 예: cd src tauri && cargo build, cd .. && npm run tauri dev