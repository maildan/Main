# 도메인 연결 문제 해결 가이드

이 문서는 Vercel에 도메인을 연결할 때 발생할 수 있는 문제와 그 해결 방법을 설명합니다.

## 일반적인 문제

### "Not authorized to use domain" (403) 오류

이 오류는 다음과 같은 이유로 발생할 수 있습니다:

1. 도메인 소유권이 증명되지 않음
2. 도메인이 이미 다른 Vercel 프로젝트에 연결됨
3. 무료 도메인(예: kro.kr)의 제한 사항

## kro.kr 도메인 설정하기

`kro.kr`과 같은 무료 도메인을 사용할 때는 다음 단계를 따르세요:

1. [https://domain.kro.kr/](https://domain.kro.kr/)에 접속하세요.
2. 해당 도메인의 관리 페이지로 이동하세요.
3. DNS 설정에서 다음 레코드를 추가하세요:
   - A 레코드: `@` → `76.76.21.21`
   - CNAME 레코드: `www` → `cname.vercel-dns.com`

## 도메인 소유권 증명하기

### 방법 1: DNS 설정을 통한 소유권 증명

1. Vercel에서 제공하는 DNS 레코드 정보를 확인하세요.
2. 도메인 제공업체의 DNS 설정 페이지에서 해당 레코드를 추가하세요.
3. DNS 변경사항이 전파되기를 기다리세요(최대 48시간).

### 방법 2: Vercel 웹 대시보드 사용

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인하세요.
2. 해당 프로젝트를 선택하세요.
3. "Settings" > "Domains" 섹션으로 이동하세요.
4. "Add" 버튼을 클릭하고 도메인을 추가하세요.
5. 안내에 따라 소유권을 증명하세요.

## DNS 설정 확인하기

도메인 설정이 올바른지 확인하려면 다음 명령어를 사용하세요:

```bash
dig +short A 도메인명
dig +short CNAME www.도메인명
```

또는 [DNS Checker](https://dnschecker.org/)와 같은 온라인 도구를 사용하세요.

## 도메인 연결 강제하기

일부 경우에는 `--force` 옵션을 사용하여 도메인 소유권 확인을 우회할 수 있습니다:

```bash
vercel domains add 도메인명 --force
```

이 명령어를 실행하려면 도메인의 DNS 설정이 이미 올바르게 구성되어 있어야 합니다.

## 대안: Vercel 제공 도메인 사용하기

도메인 연결이 계속 문제가 된다면, Vercel에서 자동으로 제공하는 도메인(예: `your-project.vercel.app`)을 사용하는 방법도 고려해 보세요.

## 도움말 및 자세한 정보

자세한 내용은 [Vercel의 도메인 문서](https://vercel.com/docs/concepts/projects/domains)를 참조하세요.
