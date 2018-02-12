import {Peercat} from "../src/assets/peercat";
import {mochaReady} from "./helper";
import {SHARE_URL_SEPARATOR} from "../src/assets/config/config";
import {humanFileSize} from "../src/assets/humanFileSize";

mochaReady(() => {
    describe("Peercat Interface", function () {
        describe("Encryption & Decryption", function () {
            it("should encrypt & decrypt data with a given password", function () {
                const encrypted = Peercat.encrypt({
                    "data": "abc"
                }, "hi");

                encrypted.should.not.equal("abc");

                const decrypted = Peercat.decrypt(encrypted, "hi");
                decrypted.data.should.equal("abc");
            });

            it("should generate a random password", function () {
                for (let i = 0; i < 32; i++) {
                    let password = Peercat.randomPassword();
                    password.length.should.be.above(30);
                }
            });

            it("should get metadata from location hash", function(){
               const encryptionString = Peercat.encrypt({ infoHash: 'abc', filename: 'test' }, 'your-password');
               window.location.hash = encryptionString + SHARE_URL_SEPARATOR + "your-password";
               const metadata = Peercat.decryptFromLocationHash();
               metadata.infoHash.should.equal('abc');
               window.location.hash = "";
            });
        });

        describe("Helper Methods", function(){
            it("should format format the torrents size to human readable format", function(){
               const number = 1024;
               humanFileSize(number).should.equal("1.0 KiB");
               humanFileSize(number, true).should.equal("1.0 kB");

               humanFileSize(999).should.equal("999 B");
            });
        });
    });
});