var Interpreter = require('../interpreter.js');
var expect = require('chai').expect;

var setup_code = "function Writer() {\
    this.output = [];\
    this.log = function(text) {\
        this.output.push(text);\
    };\
};\
    var c = new Writer();";


function getOutput(code) {
    var test = new Interpreter(setup_code + code);
    var state = null;
    var count = 0;
    while(test.step()) {
        //console.log(count , test.stateStack[0]);
        if(test.stateStack.length > 0) {
            state = test.stateStack[0];
        }
        count ++;
    }
    var results = test.extractScopeValues(state.scope);
    return results.properties.c.properties.output;
}

describe("try/catch/finally", () => {
    it("Should print the results of the try block before the finally block", () => {
        var test_code = '\
            try {\
                c.log("tried");\
            } finally {\
                c.log("finally");\
            }';
        var results = getOutput(test_code);
        expect(results).to.deep.equal(["tried","finally"]);
    });

   it("Should have an uncaught exception", () => {
        var test_code = '\
            try {\
                c.log("tried");\
                throw "oops";\
            } finally {\
                c.log("finally");\
            }';
        expect( () => {
        var results = getOutput(test_code);
        }).to.throw(Error);
    });
    
    it("Should print the results of the try block before the finally block, and not the catch branch", () => {
        var test_code = '\
            try {\
                c.log("tried");\
            } catch (e) {\
                c.log("caught");\
            } finally {\
                c.log("finally");\
            }';
        var results = getOutput(test_code);
        expect(results).to.deep.equal(["tried","finally"]);
    });


    it("Should print the results of the caught block before the finally block, and not the rest of the try branch", () => {
        var test_code = '\
            try {\
                c.log("tried");\
                throw false;\
                c.log("tried again");\
            } catch (e) {\
                c.log("caught");\
            } finally {\
                c.log("finally");\
            }';
        var results = getOutput(test_code);
        expect(results).to.deep.equal(["tried","caught","finally"]);
    });

    it("Should handle the exception in the outer try catch exception, and finish inner finally", () => {
        var test_code = '\
            try {\
              try {\
                throw "oops";\
              }\
              finally {\
                c.log("finally");\
              }\
            }\
            catch (ex) {\
              c.log("outer");\
              c.log(ex);\
            }';
        var results = getOutput(test_code);
        expect(results).to.deep.equal(["finally","outer","oops"]);
    });

    it("Should handle inner try catch, and not call outer catch", () => {
        var test_code = '\
        try {\
            try {\
                throw "oops";\
            }\
            catch (ex) {\
                c.log("inner");\
                c.log(ex);\
            }\
            finally {\
                c.log("finally");\
            }\
        }\
        catch (ex) {\
            c.log("outer");\
            c.log(ex);\
        }';
        var results = getOutput(test_code);
        expect(results).to.deep.equal(["inner","oops","finally"]);
    });

    it("Should handle rethrowing the error, and catching in the outer", () => {
        var test_code = '\
        try {\
            try {\
                throw "oops";\
            }\
            catch (ex) {\
                c.log("inner");\
                c.log(ex);\
                throw ex;\
            }\
            finally {\
                c.log("finally");\
            }\
        }\
        catch (ex) {\
            c.log("outer");\
            c.log(ex);\
        }';
        var results = getOutput(test_code);
        expect(results).to.deep.equal(["inner","oops","finally","outer","oops"]);
    });

    it("Should not catch if returning early in a finally block", () => {
        var test_code = '\
        function test() {\
            try {\
                try {\
                    throw "oops";\
                }\
                catch (ex) {\
                    c.log("inner");\
                    c.log(ex);\
                    throw ex;\
                }\
                finally {\
                    c.log("finally");\
                    return;\
                }\
            }\
            catch (ex) {\
                c.log("outer");\
            }\
        }\
        test();';
        
        var test = new Interpreter(setup_code + test_code);
        var state = null;
        var count = 0;
        expect(() => {
        while(test.step()) {
            //console.log(count , test.stateStack[0]);
            if(test.stateStack.length > 0) {
                state = test.stateStack[0];
            }
            count ++;
        }
        }).to.throw(Error);
        var results = test.extractScopeValues(test.getScope());
        expect(results.properties.c.properties.output).to.deep.equal(['inner','oops','finally']);
    });
})
