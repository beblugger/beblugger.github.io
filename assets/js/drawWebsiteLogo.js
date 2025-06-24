import { createNoise2D } from "https://cdn.skypack.dev/simplex-noise@4.0.0";
const noiseGenerators = [];
for (let i = 0; i < 6; i++) {
    const noiseGenerator = createNoise2D();
    noiseGenerators.push(noiseGenerator);
}

const canvas = document.getElementById('websiteLogoCanvas');
const ctx = canvas.getContext('2d', { alpha: true }); // 修改这一行，添加 alpha 选项
const htmlPointRadius = canvas.getAttribute("pointradius");
const htmlLineWidth = canvas.getAttribute("linewidth");
const pointRadius = htmlPointRadius ? htmlPointRadius : 3;
const lineWidth = htmlLineWidth ? htmlLineWidth : 1;
const plotScaling = Math.min(canvas.width, canvas.height) * 0.4;
let time = 0;


function getDefaultPoints() {
    return [//正5面体的各顶点4维坐标
        { vec: [0.790569, -0.456435, -0.322749, -0.25], color: '' },
        { vec: [-0.790569, -0.456435, -0.322749, -0.25], color: '' },
        { vec: [0, 0.912871, -0.322749, -0.25], color: '' },
        { vec: [0, 0, 0.968246, -0.25], color: '' },
        { vec: [0, 0, 0, 1], color: '' }
    ];
}

function loadPointsFromSessionStorage() {
    const storedPoints = sessionStorage.getItem('websiteLogoPoints');// 从sessionStorage获取points字符串
    const errorThreshold = 1e-5;
    if (!storedPoints) return getDefaultPoints();

    try {
        const points = JSON.parse(storedPoints);
        if (!Array.isArray(points) || points.length < 5) {
            throw new Error("Invalid points array length");
        }

        points.forEach(point => {
            if (!point.vec || point.vec.length < 4) {
                throw new Error("Invalid vector data");
            }

            point.vec = point.vec.slice(0, 4);

            const vecNorm = Math.sqrt(point.vec.reduce((acc, v) => acc + v ** 2, 0));
            if (Math.abs(1 - vecNorm) > errorThreshold) {
                throw new Error("Vector normalization error");
            }
        });

        return points;
    } catch (error) {
        console.error("Error loading points:", error);
        return getDefaultPoints();
    }
}

const points = loadPointsFromSessionStorage();


function draw() {
    const interpolationPointsNum = 5; // 每个点之间的插值数量
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 清除画布
    updatePoints(); // 这个函数需要你根据动画的需要来实现点的位置和颜色变化
    sessionStorage.setItem('websiteLogoPoints', JSON.stringify(points));

    // 画线
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const gradient = ctx.createLinearGradient(points[i].x, points[i].y, points[j].x, points[j].y);
            for (let k = 0; k < interpolationPointsNum; k++) {
                const t = k / (interpolationPointsNum - 1);
                let transformedVec = points[i].vec.map((v, idx) => v * (1 - t) + points[j].vec[idx] * t);
                let { h, s, v } = transformVecToHSV(transformedVec);
                gradient.addColorStop(t, `hsl(${h}, ${s * 100}%, ${v * 100}%)`);
            }
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
        }
    }

    // 画点
    points.forEach(point => {
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 更新动画或点的属性

    requestAnimationFrame(draw); // 循环调用draw函数
}

function generateTransformMatrix(time) {//随机生成一个主要值都在对角线上的矩阵
    const transformMatrix = [];
    const maxDelta = 0.01;  // 更合适的名字可以是 maxTransformationDelta

    // 初始化矩阵
    for (let i = 0; i < 4; i++) {
        transformMatrix[i] = new Array(4).fill(0);
        for (let j = 0; j < 4; j++) {
            if (i < j) {
                transformMatrix[i][j] = noiseGenerators[-1 / 2 * i ** 2 + 5 / 2 * i + j - 1](1, time) * maxDelta;
            } else if (i > j) {
                transformMatrix[i][j] = -transformMatrix[j][i];
            }
        }
    }

    // 计算对角线元素
    for (let i = 0; i < 4; i++) {
        let sumSq = 0;
        for (let j = 0; j < 4; j++) {
            if (i !== j) sumSq += transformMatrix[i][j] ** 2;
        }
        transformMatrix[i][i] = Math.sqrt(1 - sumSq);
    }

    return transformMatrix;
}

function multiplyMatrixVector(matrix, vector) {
    const result = new Array(4).fill(0);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i] += matrix[i][j] * vector[j];
        }
    }
    return result;
}

function gramSchmidt(A) {//正交化矩阵
    const rows = A.length;
    const cols = A[0].length;
    let B = new Array(rows);
    for (let i = 0; i < rows; i++) {
        B[i] = new Array(cols).fill(0);
    }

    // 对每一列应用Gram-Schmidt正交化
    for (let j = 0; j < cols; j++) {
        let v = A.map(row => row[j]);

        // 从v中减去所有之前基向量的投影
        for (let k = 0; k < j; k++) {
            let u = B.map(row => row[k]);
            let proj = project(v, u);
            v = v.map((v_i, idx) => v_i - proj[idx]);
        }

        // 归一化向量v，并设置为B的列
        let norm = Math.sqrt(v.reduce((acc, v_i) => acc + v_i * v_i, 0));
        v = v.map(v_i => v_i / norm);
        for (let i = 0; i < rows; i++) {
            B[i][j] = v[i];
        }
    }

    return B;
}

function project(v, u) {
    let dotUU = u.reduce((acc, u_i) => acc + u_i * u_i, 0);
    let dotUV = v.reduce((acc, v_i, i) => acc + v_i * u[i], 0);
    return u.map(u_i => (dotUV / dotUU) * u_i);
}


function updatePoints() {
    const transformMatrix = generateTransformMatrix(time);
    const maintainedTransformMatrix = gramSchmidt(transformMatrix);//正交化之后显然主要值还在对角线上

    points.forEach(point => {
        const vec = point.vec;
        const transformedVec = multiplyMatrixVector(maintainedTransformMatrix, vec);

        // 更新向量
        point.vec = transformedVec;

        // 更新位置和颜色
        point.x = transformedVec[0] * plotScaling + canvas.width / 2;
        point.y = transformedVec[1] * plotScaling + canvas.height / 2;

        const { h, s, v } = transformVecToHSV(transformedVec);
        point.color = `hsl(${h}, ${s * 100}%, ${v * 100}%)`;
    });

    //颜色较浅的点先绘制
    points.sort((a, b) => {
        const valueA = a.vec[2] ** 2 + a.vec[3] ** 2;
        const valueB = b.vec[2] ** 2 + b.vec[3] ** 2;
        return valueA - valueB;
    });
}

draw(); // 开始绘制

function transformVecToHSV(transformedVec) {
    const h = Math.atan2(transformedVec[2], transformedVec[3]) / Math.PI / 2 * 360;
    const s = .75;
    const v = Math.sqrt(transformedVec[2] ** 2 + transformedVec[3] ** 2) * 0.5 + 0.4;
    return { h, s, v };
}

