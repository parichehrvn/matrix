// ORIGINAL random matrix multiply //
// originally from:
//     https://github.com/JuliaLang/julia/blob/master/test/perf/perf.js //

function assert(t) { if (!t) throw new Error("assertion failed"); }

function runTest(func, arg, str) {
    var tmin = Number.POSITIVE_INFINITY;
    var t = (new Date).getTime();
    var C = func(arg);
    t = (new Date).getTime()-t;
    if (t < tmin) tmin = t;
    var err = false;
    if (C.hasOwnProperty('arr')) {
        var clen = C.arr.length;
        var _arr = C.arr;
    } else {
        var clen = C.length;
        var _arr = C;
    }
    for (i=0;i<clen;i++) {
        if (_arr[i] < 0) {
            err = true;
            console.log('C index', i, 'is invalid');
            break;
        }
    }
    if (err) {
        console.log(str, 'did not validate');
        console.log(C);
    } else {
        console.log(str, tmin, '('+tmin/227.331+'x C++)');
    }
}

function randFloat64(n) {
    var v = new Float64Array(n);
    
    for (var i = 0; i < n; i++) {
        v[i] = Math.random();
    }
    
    return v;
}

function matmul(A,B,m,l,n) {
    var C = new Array(m*n);
    var i = 0;
    var j = 0;
    var k = 0;
    
    for (i = 0; i < m; i++) {
        for (j = 0; j < n; j++) {
            var total = 0;
            
            for (k = 0; k < l; k++) {
                total += A[i*l+k]*B[k*n+j];
            }
            
            C[i*n+j] = total;
        }
    }
    
    return C;
}

function randmatmul(n) {
    var A = randFloat64(n*n);
    var B = randFloat64(n*n);
    
    return matmul(A, B, n, n, n);
}

runTest(randmatmul, 1000, 'randmatmul');


///////////////////////////////////////////////////////////////////////////////


function matmul_revInnerLoops(A,B,m,l,n) {
    // from: 66vN
    // http://www.reddit.com/r/programming/comments/pv3k9/why_we_created_julia_a_new_programming_language/c3t28nx
    var C = new Float64Array(m*n);
    var i = 0;
    var j = 0;
    var k = 0;
    
    for (i = 0; i < m*n; i++)
        C[i] = 0;

    for (i = 0; i < m; i++) {
        for (k = 0; k < l; k++) {
            for (j = 0; j < n; j++){
                C[i*n+j] += A[i*l+k]*B[k*n+j];
            }
        }
    }

    return C;    
}

function randmatmul_revInnerLoops(n) {
    var A = randFloat64(n*n);
    var B = randFloat64(n*n);
    
    return matmul_revInnerLoops(A, B, n, n, n);
}

runTest(randmatmul_revInnerLoops, 1000, 'randmatmul Inner Loops Reversed');


///////////////////////////////////////////////////////////////////////////////


function matObjMulRev(A, B) {
    var Aarr = A.arr;
    var Barr = B.arr;
    var _m = A.m;
    var _l = A.n;
    var _n = B.n;
    var C = new Float64Array(_m*_n);
    var i = 0;
    var j = 0;
    var k = 0;
    
    for (i = 0; i < _m*_n; i++)
        C[i] = 0;

    for (i = 0; i < _m; i++) {
        for (k = 0; k < _l; k++) {
            for (j = 0; j < _n; j++){
                C[i*_n+j] += Aarr[i*_l+k]*Barr[k*_n+j];
            }
        }
    }

    return C;    
}
function Matrix(arr, m, n) {
    var mul = function(B) {
        return matObjMulRev(this, B);
    }
    return {
        'arr': arr,
        'm': m,
        'n': n,
        'mul': mul,
    }
}

function randmatmul_obj(n) {
    var A = new Matrix(randFloat64(n*n), n, n);
    var B = new Matrix(randFloat64(n*n), n, n);
    
    return A.mul(B);
}

runTest(randmatmul_obj, 1000, 'randmatmul Matrix Object');


///////////////////////////////////////////////////////////////////////////////

var getCell = function(a, b, m, n, l, lmt, i, j, k) {
    if (k > lmt) {
        return a[i*l+k] * b[k*n+j];
    } else {
        return a[i*l+k] * b[k*n+j] + getCell(a, b, m, n, l, lmt, i, j, k+1);
    }
}

function matObjMulRecursive(A, B) {
    var Aarr = A.arr;
    var Barr = B.arr;
    var _m = A.m;
    var _l = A.n;
    var _n = B.n;
    var C = new Float64Array(_m*_n);
    var i = 0;
    var j = 0;
    var k = 0;

    var lmt = _l - 2;
    
    for (i = 0; i < _m; i++) {
        for (j = 0; j < _n; j++){
            C[i*_n+j] = getCell(Aarr, Barr, _m, _n, _l, lmt, i, 0, 0);
        }
    }

    return C;    
}

function MatrixTwo(arr, m, n) {
    var mul = function(B) {
        return matObjMulRecursive(this, B);
    }
    return {
        'arr': arr,
        'm': m,
        'n': n,
        'mul': mul,
    }
}
function randmatmul_obj2(n) {
    var A = new MatrixTwo(randFloat64(n*n), n, n);
    var B = new MatrixTwo(randFloat64(n*n), n, n);
    
    return A.mul(B);
}

// runTest(randmatmul_obj2, 1000, 'randmatmul Matrix Object Recursive Mul');
// WAY TOO SLOW


///////////////////////////////////////////////////////////////////////////////


function mulTrivial(A, B, out) {
    var Aarr = A.arr;
    var Barr = B.arr;
    var _m = A.m;
    var _l = A.n;
    var _n = B.n;
    var len = _m*_n;
    var isOut = !(typeof out === "undefined");
    if (!isOut) out = new Float64Array(len);
    var i = 0;
    var j = 0;
    var k = 0;
    
    for (i = 0; i < _m*_n; i++)
        out[i] = 0;

    for (i = 0; i < _m; i++) {
        for (k = 0; k < _l; k++) {
            for (j = 0; j < _n; j++){
                out[i*_n+j] += Aarr[i*_l+k]*Barr[k*_n+j];
            }
        }
    }

    if (!isOut) return new MatrixThree(out, _m, _n);    
}
function getQuad(A, initi, initj, qm, qn) {
    var marr = A.arr;
    var mm = A.m;
    var mn = A.n;
    var mmo = A.m - 1;
    var nmo = A.n - 1;
    var mmax = initi + qm;
    var nmax = initj + qn;
    var qarr = new Float64Array(qm*qn);
    var i = 0;
    var j = 0;
    for (i=initi; i<mmax; i++) {
        if (i >= mmo) {
            for (j=initj; j<nmax; j++) {
                qarr[i*qm+j] = 0;
            }
        } else {
            for (j=initj; j<nmax; j++) {
                if (j >= nmo) {
                    qarr[i*qm+j] = 0;
                } else {
                    qarr[i*qm+j] = marr[i*mm+j];
                }
            }
        }
    }
    return new MatrixThree(qarr, qm, qn);
}

function joinQuads(C1, C2, C3, C4, out) {
    var _m = C1.m+C2.m;
    var _n = C1.n+C3.n;
    var len = _m * _n;
    var qm = C1.m;
    var qn = C2.n;
    var isOut = !(typeof out === "undefined");
    if (!isOut) out = new Float64Array(len);
    var i = 0;
    var j = 0;
    for (i=0;i<_m;i++) {
        for (j=0;j<_n;j++) {
            if (i < qm) {
                if (j < qn) {
                    out[i*_m+j] = C1.arr[i*qm+j];
                } else {
                    out[i*_m+j] = C2.arr[i*qm+j-qn];
                }
            } else {
                if (j < qn) {
                    out[i*_m+j] = C3.arr[(i-qm)*qm+j];
                } else {
                    out[i*_m+j] = C3.arr[(i-qm)*qm+j-qn];
                }
            }
        }
    }
    if (!isOut) return new MatrixThree(out, _m, _n);
}
function mataddorsub(A, B, sub, out) {
    sub || (sub = false);
    var Aarr = A.arr;
    var Barr = B.arr;
    var _m = A.m;
    var _n = A.n;
    var len = _m*_n;
    var isOut = !(typeof out === "undefined");
    if (!isOut) out = new Float64Array(len);
    var i = 0;
    if (sub) {
        for (i=0; i < len; i++) {
            out[i] = Aarr[i] - Barr[i];
        }
    } else {
        for (i=0; i < len; i++) {
            out[i] = Aarr[i] + Barr[i];
        }
    }
    if (!isOut) return new MatrixThree(out, _m, _n);
}
function matadd(A, B, out) {
    return mataddorsub(A, B, false, out);
}
function matsub(A, B, out) {
    return mataddorsub(A, B, true, out);
}
var LIMIT = 250;
function strassenmul(A, B, out) {
    var _m = A.m;
    var _n = A.n;
    if (_m <= LIMIT || _n <= LIMIT) {
        return mulTrivial(A, B);
    }
    var qn = Math.ceil(_m/2);
    var A1 = A.getQuad(0, 0, qn, qn);
    var A2 = A.getQuad(0, qn, qn, qn);
    var A3 = A.getQuad(qn, 0, qn, qn);
    var A4 = A.getQuad(qn, qn, qn, qn);
    var B1 = B.getQuad(0, 0, qn, qn);
    var B2 = B.getQuad(0, qn, qn, qn);
    var B3 = B.getQuad(qn, 0, qn, qn);
    var B4 = B.getQuad(qn, qn, qn, qn);

    var M1 = A1.add(A4).mul(B1.add(B4));
    var M2 = A3.add(A4).mul(B1);
    var M3 = A1.mul(B2.sub(B4));
    var M4 = A4.mul(B3.sub(B1));
    var M5 = A1.add(A2).mul(B4);
    var M6 = A3.sub(A1).mul(B1.add(B2));
    var M7 = A2.sub(A4).mul(B3.add(B4));

    return joinQuads(
        M1.add(M4).sub(M5).add(M7),
        M3.add(M5),
        M2.add(M4),
        M1.sub(M2).add(M3).add(M6),
        out
    );
}
function MatrixThree(arr, m, n) {
    this.arr = arr;
    this.m = m;
    this.n = n;
    this.getQuad = function(initi, initj, qm, qn) {
        return getQuad(this, initi, initj, qm, qn);
    }
    this.mulTrivial = function(B, out) {
        return mulTrivial(this, B, out);
    }
    this.mul = function(B, out) {
        return strassenmul(this, B, out);
    }
    this.add = function(B, out) {
        return matadd(this, B, out);
    }
    this.sub = function(B, out) {
        return matsub(this, B, out);
    }

    return this;
}
function randmatmul_strass(n) {
    var A = new MatrixThree(randFloat64(n*n), n, n);
    var B = new MatrixThree(randFloat64(n*n), n, n);
    
    return A.mul(B);
}
runTest(randmatmul_strass, 1000, 'randmatmul Strassen');
