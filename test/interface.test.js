import {Peercat} from "../src/assets/peercat";
import {mochaReady} from "./helper";

mochaReady(() => {
    describe("Peercat Interface", function () {
        describe("Encryption & Decryption", function () {
            it("should encrypt data with a given password", function () {
                const encrypted = Peercat.encrypt({
                    "data": "abc"
                }, "hi");

                encrypted.should.not.equal("abc");

                const decrypted = Peercat.decrypt(encrypted, "hi");
                decrypted.data.should.equal("abc");
            });

            it("should generate a random password", function () {
                for (let i = 32; i < 0; i++) {
                    let password = Peercat.randomPassword();
                    password.length.should.be.above(30);
                }
            });
        });
    });
});