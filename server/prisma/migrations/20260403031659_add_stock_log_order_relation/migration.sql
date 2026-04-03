-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "outType" TEXT,
    "quantity" INTEGER NOT NULL,
    "costPrice" REAL,
    "reason" TEXT,
    "orderId" INTEGER,
    "supplierId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockLog_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockLog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StockLog" ("costPrice", "createdAt", "id", "orderId", "outType", "partId", "quantity", "reason", "source", "supplierId", "type") SELECT "costPrice", "createdAt", "id", "orderId", "outType", "partId", "quantity", "reason", "source", "supplierId", "type" FROM "StockLog";
DROP TABLE "StockLog";
ALTER TABLE "new_StockLog" RENAME TO "StockLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
