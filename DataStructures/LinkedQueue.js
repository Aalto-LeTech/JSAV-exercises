/**
 * A visualization of a queue using a linked list.
 * The queue has a header node and front and rear pointers.
 * Provides enqueue and dequeue operations and updates the visualization accordingly.
*/
class LinkedQueue {
  /**
   * @param {JSAV_object} jsav - The JSAV instance.
   * @param {object} [options={}] - The options to be passed for jsav.ds.list.
   */
  constructor(jsav, options = {}) {
    this._queue = jsav.ds.list(options);
    // Add header node to the queue
    this._queue.addFirst("null");
    // Assign front and rear pointers to the header node.
    this._headPointer = jsav.pointer("front", this._queue.get(0), {left: -10});
    this._rearPointer = jsav.pointer("rear", this._queue.get(0), {left: 30});
    this._queue.layout();
  }

  /**
   * Enqueues a new node with the given value.
   * @param {*} value - The value to be enqueued.
   */
  enqueue(value) {
    const newNode = this._queue.newNode(value);
    this._queue.addLast(newNode);
    this._queue.layout();
    this._rearPointer.target(newNode);
  }
  /**
   * Dequeues the front node from the queue.
   * @returns {*} The value of the dequeued node.
   */
  dequeue() {
    const value = this._queue.get(1).value();
    this._queue.remove(1);
    this._queue.layout();
    if (this._queue.size() === 1) {
      this._rearPointer.target(this._queue.get(0));
    }

    return value;
  }
}
