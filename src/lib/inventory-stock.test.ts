import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma - using factory function to avoid hoisting issues
vi.mock('./db', () => ({
  default: {
    inventoryItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    inventoryStockMovement: {
      create: vi.fn(),
    },
    lineItem: {
      findMany: vi.fn(),
    },
    masterProduct: {
      findUnique: vi.fn(),
    },
  },
}))

// Import after mocking
import {
  checkInventoryItemStock,
  checkOrderStock,
  deductInventoryStock,
  getLowStockAlerts,
  getProductionCapacity,
} from './inventory-stock'
import prisma from './db'

// Get typed mock
const mockPrisma = prisma as any

describe('inventory-stock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkInventoryItemStock', () => {
    it('should return canFulfill=true for individual item with sufficient stock', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        sku: 'SKU001',
        name: 'Test Item',
        currentStock: 100,
        isComposite: false,
        recipeComponents: [],
      })

      const result = await checkInventoryItemStock('item-1', 50)

      expect(result.canFulfill).toBe(true)
      expect(result.availableQuantity).toBe(100)
      expect(result.insufficientComponents).toHaveLength(0)
    })

    it('should return canFulfill=false for individual item with insufficient stock', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        sku: 'SKU001',
        name: 'Test Item',
        currentStock: 30,
        isComposite: false,
        recipeComponents: [],
      })

      const result = await checkInventoryItemStock('item-1', 50)

      expect(result.canFulfill).toBe(false)
      expect(result.availableQuantity).toBe(30)
      expect(result.insufficientComponents).toHaveLength(1)
      expect(result.insufficientComponents[0].shortage).toBe(20)
    })

    it('should check component stock for composite items', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'composite-1',
        sku: 'COMP001',
        name: 'Composite Product',
        currentStock: 0,
        isComposite: true,
        recipeComponents: [
          {
            id: 'rc-1',
            quantity: 2,
            componentItem: {
              id: 'comp-a',
              sku: 'COMP-A',
              name: 'Component A',
              currentStock: 100,
              unit: 'buc',
            },
          },
          {
            id: 'rc-2',
            quantity: 1,
            componentItem: {
              id: 'comp-b',
              sku: 'COMP-B',
              name: 'Component B',
              currentStock: 50,
              unit: 'buc',
            },
          },
        ],
      })

      const result = await checkInventoryItemStock('composite-1', 10)

      expect(result.canFulfill).toBe(true)
      expect(result.availableQuantity).toBe(50) // min(100/2, 50/1) = min(50, 50) = 50
      expect(result.isComposite).toBe(true)
      expect(result.hasRecipe).toBe(true)
    })

    it('should detect insufficient component stock', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'composite-1',
        sku: 'COMP001',
        name: 'Composite Product',
        currentStock: 0,
        isComposite: true,
        recipeComponents: [
          {
            id: 'rc-1',
            quantity: 5,
            componentItem: {
              id: 'comp-a',
              sku: 'COMP-A',
              name: 'Component A',
              currentStock: 10,
              unit: 'buc',
            },
          },
        ],
      })

      const result = await checkInventoryItemStock('composite-1', 5)

      expect(result.canFulfill).toBe(false)
      expect(result.insufficientComponents).toHaveLength(1)
      expect(result.insufficientComponents[0].requiredQuantity).toBe(25)
      expect(result.insufficientComponents[0].availableStock).toBe(10)
      expect(result.insufficientComponents[0].shortage).toBe(15)
    })

    it('should return canFulfill=false for composite without recipe', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'composite-1',
        sku: 'COMP001',
        name: 'Composite Without Recipe',
        currentStock: 0,
        isComposite: true,
        recipeComponents: [],
      })

      const result = await checkInventoryItemStock('composite-1', 1)

      expect(result.canFulfill).toBe(false)
      expect(result.hasRecipe).toBe(false)
    })

    it('should handle non-existent item', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(null)

      const result = await checkInventoryItemStock('non-existent', 1)

      expect(result.canFulfill).toBe(false)
      expect(result.name).toBe('Articol negăsit')
    })
  })

  describe('checkOrderStock', () => {
    it('should check multiple items and aggregate results', async () => {
      mockPrisma.inventoryItem.findUnique
        .mockResolvedValueOnce({
          id: 'item-1',
          sku: 'SKU001',
          name: 'Item 1',
          currentStock: 100,
          isComposite: false,
          recipeComponents: [],
        })
        .mockResolvedValueOnce({
          id: 'item-2',
          sku: 'SKU002',
          name: 'Item 2',
          currentStock: 5,
          isComposite: false,
          recipeComponents: [],
        })

      const result = await checkOrderStock([
        { inventoryItemId: 'item-1', quantity: 50 },
        { inventoryItemId: 'item-2', quantity: 10 },
      ])

      expect(result.canFulfill).toBe(false)
      expect(result.results).toHaveLength(2)
      expect(result.insufficientItems).toHaveLength(1)
      expect(result.insufficientItems[0].sku).toBe('SKU002')
    })
  })

  describe('deductInventoryStock', () => {
    it('should deduct stock for individual item', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        sku: 'SKU001',
        name: 'Test Item',
        currentStock: 100,
        isComposite: false,
        recipeComponents: [],
      })
      mockPrisma.inventoryItem.update.mockResolvedValue({})
      mockPrisma.inventoryStockMovement.create.mockResolvedValue({})

      const result = await deductInventoryStock('item-1', 30, {
        orderId: 'order-1',
        invoiceId: 'invoice-1',
      })

      expect(result.success).toBe(true)
      expect(result.movements).toHaveLength(1)
      expect(result.movements[0].previousStock).toBe(100)
      expect(result.movements[0].newStock).toBe(70)
      expect(mockPrisma.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { currentStock: 70 },
      })
    })

    it('should deduct stock from all components for composite item', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'composite-1',
        sku: 'COMP001',
        name: 'Composite Product',
        currentStock: 0,
        isComposite: true,
        recipeComponents: [
          {
            id: 'rc-1',
            quantity: 2,
            componentItemId: 'comp-a',
            componentItem: {
              id: 'comp-a',
              sku: 'COMP-A',
              name: 'Component A',
              currentStock: 100,
            },
          },
          {
            id: 'rc-2',
            quantity: 3,
            componentItemId: 'comp-b',
            componentItem: {
              id: 'comp-b',
              sku: 'COMP-B',
              name: 'Component B',
              currentStock: 60,
            },
          },
        ],
      })
      mockPrisma.inventoryItem.update.mockResolvedValue({})
      mockPrisma.inventoryStockMovement.create.mockResolvedValue({})

      const result = await deductInventoryStock('composite-1', 5)

      expect(result.success).toBe(true)
      expect(result.movements).toHaveLength(2)
      // Component A: 5 * 2 = 10 deducted
      expect(result.movements[0].quantity).toBe(10)
      expect(result.movements[0].newStock).toBe(90)
      // Component B: 5 * 3 = 15 deducted
      expect(result.movements[1].quantity).toBe(15)
      expect(result.movements[1].newStock).toBe(45)
    })

    it('should fail for composite without recipe', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'composite-1',
        sku: 'COMP001',
        name: 'No Recipe',
        currentStock: 0,
        isComposite: true,
        recipeComponents: [],
      })

      const result = await deductInventoryStock('composite-1', 5)

      expect(result.success).toBe(false)
      expect(result.error).toContain('nu are rețetă')
    })
  })

  describe('getLowStockAlerts', () => {
    it('should return items with stock below minimum', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          sku: 'SKU001',
          name: 'Low Stock Item',
          currentStock: 5,
          minStock: 10,
          unit: 'buc',
          isComposite: false,
        },
        {
          id: 'item-2',
          sku: 'SKU002',
          name: 'OK Stock Item',
          currentStock: 50,
          minStock: 10,
          unit: 'buc',
          isComposite: false,
        },
      ])

      const result = await getLowStockAlerts()

      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('SKU001')
      expect(result[0].shortage).toBe(5)
    })
  })

  describe('getProductionCapacity', () => {
    it('should calculate production capacity based on limiting component', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'composite-1',
        sku: 'COMP001',
        name: 'Composite',
        isComposite: true,
        recipeComponents: [
          {
            componentItem: {
              id: 'comp-a',
              sku: 'COMP-A',
              name: 'Component A',
              currentStock: 100,
            },
            quantity: 2,
          },
          {
            componentItem: {
              id: 'comp-b',
              sku: 'COMP-B',
              name: 'Component B',
              currentStock: 30,
            },
            quantity: 1,
          },
        ],
      })

      const result = await getProductionCapacity('composite-1')

      expect(result.canProduce).toBe(30) // Limited by Component B (30/1 = 30)
      expect(result.limitingComponent?.sku).toBe('COMP-B')
    })

    it('should return 0 for non-composite items', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue({
        id: 'item-1',
        sku: 'SKU001',
        name: 'Individual',
        isComposite: false,
        recipeComponents: [],
      })

      const result = await getProductionCapacity('item-1')

      expect(result.canProduce).toBe(0)
    })
  })
})
