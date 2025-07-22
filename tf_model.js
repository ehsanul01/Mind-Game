let model;
let labelMap = {};
let reverseMap = [];

async function createModel(inputSize, outputSize) {
  model = tf.sequential();
  model.add(tf.layers.dense({inputShape: [inputSize], units: 16, activation: 'relu'}));
  model.add(tf.layers.dense({units: outputSize, activation: 'softmax'}));
  model.compile({optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy']});
}

async function trainModel(data, labels, numLabels) {
  const xs = tf.tensor2d(data);
  const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), numLabels);
  await model.fit(xs, ys, {epochs: 50});
}

async function predictAnswer(input) {
  const xs = tf.tensor2d([input]);
  const prediction = model.predict(xs);
  const index = prediction.argMax(-1).dataSync()[0];
  return reverseMap[index];
}
