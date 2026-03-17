if (!global.payments) {
  global.payments = {};
}

export function getPaymentsStore() {
  if (!global.payments) {
    global.payments = {};
  }
  return global.payments;
}
