navigator.serviceWorker && (async serviceWorker => {
  const options = undefined;
  // const options = { scope: './caches/' };
  const registration = await serviceWorker.register('./service-worker.js', options);

  serviceWorker.addEventListener('controllerchange', console.info);

  const worker =
    (registration.installing && (await registration.installing)) ||
    (registration.waiting && (await registration.waiting)) ||
    (registration.active);


  // Unregister Redundant
  // const registrations = await serviceWorker.getRegistrations();

  // console.log({ registration, registrations, worker });

  // for (const registration of registrations) {
  //   console.log(registration);
  // }
})(navigator.serviceWorker);
