/* The admin pages open only after the PIN (see gate() in app.js), once per
   browser session. */
(async () => {
  const main = document.querySelector('main');
  let unlocked = false;
  try {
    unlocked = sessionStorage.getItem('admin') === 'yes';
  } catch {
    unlocked = false;
  }
  if (unlocked) return;
  main.hidden = true;
  if (await gate()) main.hidden = false;
  else location.replace('/');
})();
