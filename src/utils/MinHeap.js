/**
 * MinHeap (cola de prioridad) para optimizar A*
 * Reduce la complejidad de encontrar el mínimo de O(n) a O(log n)
 */
export default class MinHeap {
    constructor(compareFn) {
        this.heap = [];
        this.compare = compareFn || ((a, b) => a - b);
    }

    /**
     * Inserta un elemento en el heap
     * @param {*} item 
     */
    push(item) {
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    /**
     * Extrae y retorna el elemento mínimo
     * @returns {*}
     */
    pop() {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();

        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this._bubbleDown(0);
        return min;
    }

    /**
     * Retorna el elemento mínimo sin extraerlo
     * @returns {*}
     */
    peek() {
        return this.heap[0];
    }

    /**
     * Retorna el tamaño del heap
     * @returns {Number}
     */
    size() {
        return this.heap.length;
    }

    /**
     * Verifica si el heap está vacío
     * @returns {Boolean}
     */
    isEmpty() {
        return this.heap.length === 0;
    }

    /**
     * Verifica si un elemento está en el heap
     * @param {*} item 
     * @returns {Boolean}
     */
    contains(item) {
        return this.heap.includes(item);
    }

    /**
     * Limpia el heap
     */
    clear() {
        this.heap = [];
    }

    /**
     * Mueve un elemento hacia arriba para mantener la propiedad del heap
     * @param {Number} index 
     */
    _bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            
            if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) {
                break;
            }

            [this.heap[index], this.heap[parentIndex]] = 
                [this.heap[parentIndex], this.heap[index]];
            
            index = parentIndex;
        }
    }

    /**
     * Mueve un elemento hacia abajo para mantener la propiedad del heap
     * @param {Number} index 
     */
    _bubbleDown(index) {
        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;

            if (leftChild < this.heap.length && 
                this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
                smallest = leftChild;
            }

            if (rightChild < this.heap.length && 
                this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
                smallest = rightChild;
            }

            if (smallest === index) break;

            [this.heap[index], this.heap[smallest]] = 
                [this.heap[smallest], this.heap[index]];
            
            index = smallest;
        }
    }
}
