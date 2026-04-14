# DESIGN.md - Antigravity x Gemma 4 "The Synthetic Ether"

안티그래비티 IDE 내부에서 젬마 4와 소통하는 프리미엄 익스텐션 UI 가이드입니다.

## 1. 디자인 컨셉: The Synthetic Ether (합성 에테르)
단단하고 딱딱한 박스 형태를 벗어나, 코드 환경 위에 가볍게 떠 있는 듯한 투명하고 세련된 인터페이스를 지향합니다.

- **핵심 키워드**: 글래스모피즘(Glassmorphism), 토널 네스팅(Tonal Nesting), 미래지향적(Futuristic)
- **주요 기법**: 1px 테두리 대신 배경색의 미세한 변화(Tonal shift)와 투명도(Opacity)를 활용하여 깊이감을 표현

## 2. 색상 팔레트 (Color Palette)

### Foundations
- `Foundation`: `#10141a` (void-like base)
- `Surface Container`: `#1c2026`
- `Surface Content`: `#dfe2eb` (eye-friendly white)

### Accents
- **Primary (Purple)**: `#9a4ad9` (Main Actions / AI Focus)
- **Secondary (Cyan)**: `#00daf3` (Status Indicators / Code Hints)
- **Tertiary (Neutral)**: `#c2c6d4` (Metadata / Secondary Info)

### Glassmorphism
- `Glass BG`: `rgba(30, 41, 59, 0.7)`
- `Blur`: `backdrop-filter: blur(12px)`

## 3. 타이포그래피 (Typography)
- **Primary Font**: `Inter` (정밀하고 기술적인 가독성)
- **Headline Font**: `Outfit` (미래지향적이고 부드러운 인상)

### Hierarchy
- `Headline`: 1.5rem / Outfit / Bold (상태 변화 및 큰 타이틀)
- `Body`: 0.875rem / Inter / Regular (대화 및 일반 텍스트)
- `Label`: 0.75rem / Inter / Medium (타임스탬프, 메타데이터)

## 4. UI 구성 요소 규칙 (UI Components)

### 채팅 버블 (Message Bubbles)
- **Gemma 4 (AI)**: `surface_container_high` 배경 + 글래스모피즘 + 왼쪽 2px `primary` 포인트 라인.
- **User (Big Brother)**: `surface_container_low` 배경 + 아주 연한 고스트 보더.

### 입력창 (Chat Input)
- 별도의 박스 경계선 없이 하단 트레이 형태로 구성. 
- 포커스 시 하단에서 `secondary` (Cyan) 광원 효과가 은은하게 퍼짐.

### 상태 표시 (Status Indicator)
- **Connected**: `Secondary` (Cyan) 펄스 애니메이션.
- **Disconnected**: `Error` (Light Coral) 고정 표시.

---
**보고자**: 안 본부장 (Senior AI UI/UX Designer)
**작성일**: 2026-04-14
