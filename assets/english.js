document.querySelector('.print-template')?.addEventListener('click', () => {
  document.body.classList.add('print-diary');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('print-diary'));
