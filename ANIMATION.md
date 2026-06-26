# 상태 애니메이션 삽입 가이드

배송 상태 영역(`#status-animation`)은 현재 상태에 따라 자동으로 분기됩니다.
지금은 emoji + CSS 기본 모션이 들어간 **placeholder**이며, 원하는 애니메이션으로 자유롭게 교체할 수 있습니다.

## 동작 방식

조회 시 JS가 컨테이너에 현재 상태를 주입합니다:

```html
<div id="status-animation" data-status="delivery"> ... </div>
```

`data-status` 값은 다음 6가지 중 하나입니다:

| data-status | 의미 | 기본 모션 |
|---|---|---|
| `ordered`   | 주문접수 | pulse |
| `prepared`  | 상품준비 | wiggle |
| `picked`    | 집화완료 | pop |
| `transit`   | 간선이동 | drive |
| `delivery`  | 배송중   | scoot |
| `delivered` | 배송완료 | pop (1회) |

## 교체 방법

### 1) Lottie (권장)
`#status-anim-slot` 안의 placeholder를 Lottie 플레이어로 교체하고, `data-status`에 맞춰 JSON을 바꿉니다.

```html
<!-- index.html: <script src="https://unpkg.com/@lottiefiles/lottie-player"></script> -->
<div id="status-anim-slot">
  <lottie-player id="lottie" autoplay loop style="width:160px;height:160px"></lottie-player>
</div>
```

```js
// js/app.js 의 renderStatusAnimation() 끝에 추가
const SRC = {
  ordered: '/anim/ordered.json', prepared: '/anim/prepared.json',
  picked: '/anim/picked.json', transit: '/anim/transit.json',
  delivery: '/anim/delivery.json', delivered: '/anim/delivered.json',
};
document.getElementById('lottie').load(SRC[data.currentStep]);
```

### 2) 동영상 / GIF
```html
<div id="status-anim-slot">
  <video id="anim-video" autoplay loop muted playsinline width="160" height="160"></video>
</div>
```
```js
document.getElementById('anim-video').src = `/anim/${data.currentStep}.mp4`;
```

### 3) CSS만 커스텀
`css/styles.css`의 `.status-animation[data-status="..."] .status-anim-emoji` 규칙과
`@keyframes`를 수정하면 됩니다.

## 접근성
`@media (prefers-reduced-motion: reduce)`가 적용되어, 모션 최소화 설정 사용자에게는 애니메이션이 멈춥니다.
교체 시에도 이 미디어쿼리를 존중해 주세요.
