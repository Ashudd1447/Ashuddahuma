/* The admin pages open only for the admin's account, checked with the auth
   server (see account.verifyAdmin), or on localhost, the admin's own
   computer. Anyone else is sent to the home page. */
(async () => {
  const main = document.querySelector('main');
  main.hidden = true;
  if (await account.verifyAdmin()) main.hidden = false;
  else location.replace('/');
})();
