Deno.serve((request) => {
  const url = new URL(request.url);
  const reference = url.searchParams.get('trxref') || url.searchParams.get('reference') || '';
  return new Response(`<!doctype html><html><body><p>Payment received. You can return to the app.</p><p>${reference ? 'Reference: ' + reference : ''}</p></body></html>`, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
});
