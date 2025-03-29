# kro.kr 도메인 Vercel 연결 가이드

무료 kro.kr 도메인을 Vercel에 연결하기 위한 상세 설정 가이드입니다.

## DNS 설정 단계

### 1. domain.kro.kr 로그인

1. [https://domain.kro.kr/](https://domain.kro.kr/)에 접속하세요.
2. 계정으로 로그인하세요.
3. 대시보드에서 `eloop.kro.kr` 도메인을 선택하세요.

### 2. DNS 설정 변경

다음과 같이 설정하세요:

#### A 레코드 설정
1. "고급설정 (DNS)" 섹션으로 이동하세요
2. "IP연결(A)" 항목에서:
   - `[+]` 버튼을 클릭 (새 레코드 추가)
   - 호스트 이름: **비워두기** 또는 `@` 입력 (루트 도메인을 의미)
   - IP 주소: `76.76.21.21` 입력
   - 저장 버튼 클릭

#### CNAME 레코드 설정
1. "별칭(CNAME)" 항목에서:
   - `[+]` 버튼을 클릭 (새 레코드 추가)
   - 호스트 이름: `www` 입력
   - 값(Target): `cname.vercel-dns.com` 입력
   - 저장 버튼 클릭

### 3. 기존 레코드 삭제

이전에 설정한 부적절한 레코드가 있다면 `[-]` 버튼을 클릭하여 삭제하세요.

### 4. 설정 확인

올바르게 설정된 DNS 레코드는 다음과 같아야 합니다:

| 유형 | 호스트명 | 값/대상 |
|------|---------|---------|
| A    | @ 또는 빈칸 | 76.76.21.21 |
| CNAME | www    | cname.vercel-dns.com |

## 설정 후 단계

1. DNS 변경 사항이 적용되는 데 최대 48시간이 걸릴 수 있습니다. 일반적으로는 몇 분에서 몇 시간 내에 적용됩니다.
2. 다음 명령으로 DNS 전파 상태를 확인할 수 있습니다:
   ```
   dig +short A eloop.kro.kr
   dig +short CNAME www.eloop.kro.kr
   ```

3. DNS 설정이 전파된 후, 다시 Vercel 도메인 연결을 시도해보세요:
   ```
   vercel domains add eloop.kro.kr
   ```

## 문제 해결

kro.kr 도메인이 계속 연결되지 않는다면, 다음을 시도해보세요:

1. Vercel 프로젝트 설정에서 직접 도메인 추가: 
   - Vercel 대시보드 접속
   - 해당 프로젝트 선택
   - Settings > Domains 메뉴로 이동
   - "Add" 버튼을 클릭하고 `eloop.kro.kr` 입력

2. 임시 대안으로 Vercel이 제공하는 기본 도메인(예: `typing-stats-app.vercel.app`)을 사용할 수 있습니다.
