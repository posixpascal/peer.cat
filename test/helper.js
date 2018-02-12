export const mochaReady = (cb) => {
    if (typeof describe === "function"){

        return cb();
    }
  setTimeout(() => {
     mochaReady(cb);
  });
};