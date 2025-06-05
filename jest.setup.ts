if (typeof global.btoa === 'undefined') {
  global.btoa = (data: string) => Buffer.from(data, 'binary').toString('base64');
}
