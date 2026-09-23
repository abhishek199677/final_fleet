import * as React from "react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { PaginationContent, PaginationDots, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationRoot } from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableRow, TableCaption } from "@/components/ui/table"

interface DataTableProps<TData> {
  columns: Array<{
    accessorKey: string
    header: string
    cell?: React.ComponentType<{ value: any; row: TData }>
  }>
  data: TData[]
  initialSort?: {
    id: string
    desc: boolean
  }
  initialPageSize?: number
  className?: string
}

export function DataTable<TData>({
  columns,
  data,
  initialSort,
  initialPageSize = 10,
  className,
}: DataTableProps<TData>) {
  const [pageIndex, setPageIndex] = React.useState(0)
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean } | null>(initialSort ?? null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const pageSize = initialPageSize

  // Filter data based on search term
  const filteredData = data.filter((row) =>
    columns.some((column) => {
      const value = row[column.accessorKey as keyof TData]
      return value
        && String(value)
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    })
  )

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sorting) return filteredData
    return [...filteredData].sort((a, b) => {
      const aValue = a[sorting.id as keyof TData]
      const bValue = b[sorting.id as keyof TData]

      if (aValue === null || aValue === undefined) return sorting.desc ? 1 : -1
      if (bValue === null || bValue === undefined) return sorting.desc ? -1 : 1

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sorting.desc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sorting.desc
        ? (Number(aValue) || 0) - (Number(bValue) || 0)
        : (Number(bValue) || 0) - (Number(aValue) || 0)
    })
  }, [filteredData, sorting])

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const start = pageIndex * pageSize
    const end = start + pageSize
    return sortedData.slice(start, end)
  }, [sortedData, pageIndex, pageSize])

  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize))

  const handleSort = (columnId: string) => {
    setSorting((prev) => {
      if (prev && prev.id === columnId) {
        return { id: columnId, desc: !prev.desc }
      }
      return { id: columnId, desc: false }
    })
    setPageIndex(0) // Reset to first page when sorting changes
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center space-x-3">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setPageIndex(0) // Reset to first page when search changes
          }}
          className="w-[200px] sm:w-[250px]"
        >
          <search className="h-4 w-4 mr-2" />
        </Input>
        <div className="hidden sm:flex items-center space-x-2">
          <button
            onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
            disabled={pageIndex === 0}
            className="hover:opacity-80"
          >
            <chevron-left className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <button
            onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
            disabled={pageIndex >= pageCount - 1}
            className="hover:opacity-80"
          >
            <chevron-right className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className={cn("w-full", className)}>
          <TableCaption>
            Showing
            {" "}
            <span className="font-medium">
              {sortedData.length > 0
                ? Math.min(pageIndex * pageSize + 1, sortedData.length)
                : 0}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {sortedData.length > 0
                ? Math.min((pageIndex + 1) * pageSize, sortedData.length)
                : 0}
            </span>{" "}
            of{" "}
            <span className="font-medium">{sortedData.length}</span>{" "}
            entries
          </TableCaption>
          <thead className="bg-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.accessorKey}
                  onClick={() => handleSort(column.accessorKey)}
                  className={cn(
                    "h-12 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer",
                    sorting?.id === column.accessorKey
                      ? "font-semibold"
                      : ""
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {sorting?.id === column.accessorKey ? (
                      sorting?.desc ? (
                        <chevron-down className="h-4 w-4" />
                      ) : (
                        <chevron-up className="h-4 w-4" />
                      )
                    ) : (
                      <chevron-up-down className="h-4 w-4 opacity-50" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-muted">
            {paginatedData.map((row, i) => (
              <tr
                key={`${row.id || i}`}
                className={cn(
                  i % 2 === 0 ? "bg-white" : "bg-muted/50",
                  "hover:bg-muted/100"
                )}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={`${colIndex}`}
                    className="p-4 text-sm"
                  >
                    {column.cell ? (
                      <column.cell
                        value={row[column.accessorKey as keyof TData]}
                        row={row}
                      />
                    ) : (
                      <span className="block">
                        {typeof row[column.accessorKey as keyof TData] === "string" &&
                          String(row[column.accessorKey as keyof TData]).length > 50
                          ? `${String(row[column.accessorKey as keyof TData]).substring(0, 50)}...`
                          : row[column.accessorKey as keyof TData]
                        }
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {data.length > 0 && (
        <div className="flex justify-between items-center mt-4 space-x-2">
          {pageCount > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                disabled={pageIndex === 0}
                className="hover:opacity-80"
              >
                <chevron-left className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pageIndex + 1} of {pageCount}
              </span>
              <button
                onClick={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                disabled={pageIndex >= pageCount - 1}
                className="hover:opacity-80"
              >
                <chevron-right className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Showing {paginatedData.length} of {sortedData.length} filtered entries
          </div>
        </div>
      )}
    </div>
  )
}