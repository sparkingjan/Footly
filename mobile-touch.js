/* Pointer-based touch dragging for the lineup pitch. */
(() => {
  const pitch = document.getElementById('football-pitch');
  if (!pitch || !window.PointerEvent) return;
  const roles = ['GK','LB','CB','RB','LWB','RWB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'];
  const roleAt = (x, y) => y > .84 ? 'GK' : y > .68 ? (x < .3 ? 'LB' : x > .7 ? 'RB' : 'DMF') : y > .48 ? (x < .3 ? 'LMF' : x > .7 ? 'RMF' : 'CMF') : y > .27 ? (x < .3 ? 'LWF' : x > .7 ? 'RWF' : 'AMF') : (x < .3 ? 'LWF' : x > .7 ? 'RWF' : y < .16 ? 'CF' : 'SS');
  let active = null;
  const pointInPitch = event => {
    const rect = pitch.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    return { rect, x, y, inside: event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom };
  };
  const move = event => {
    if (!active || event.pointerType === 'mouse') return;
    const position = pointInPitch(event);
    if (!position.inside) return;
    active.player.style.left = (position.x * 100) + '%';
    active.player.style.top = (position.y * 100) + '%';
    const select = active.player.querySelector('select');
    if (select) select.value = roleAt(position.x, position.y);
    event.preventDefault();
  };
  const end = event => {
    if (!active || (event.pointerId && event.pointerId !== active.pointerId)) return;
    move(event);
    active.player.classList.remove('is-dragging');
    active = null;
  };
  pitch.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || event.target.closest('select')) return;
    const player = event.target.closest('.pitch-player');
    if (!player) return;
    active = { player, pointerId: event.pointerId };
    player.classList.add('is-dragging');
    player.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }, { passive: false });
  pitch.addEventListener('pointermove', move, { passive: false });
  pitch.addEventListener('pointerup', end, { passive: false });
  pitch.addEventListener('pointercancel', end, { passive: false });
})();
