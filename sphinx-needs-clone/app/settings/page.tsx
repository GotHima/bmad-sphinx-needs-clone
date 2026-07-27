import { listNeedTypesWithCount, listStatuses } from '@/lib/queries/config'
import { NeedTypeTable } from '@/components/settings/NeedTypeTable'
import { StatusList } from '@/components/settings/StatusList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const types = listNeedTypesWithCount()
  const statuses = listStatuses()
  return (
    <main className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <Tabs defaultValue="need-types">
        <TabsList>
          <TabsTrigger value="need-types">Need Types</TabsTrigger>
          <TabsTrigger value="status-values">Status Values</TabsTrigger>
        </TabsList>
        <TabsContent value="need-types" className="mt-4">
          <NeedTypeTable initialTypes={types} />
        </TabsContent>
        <TabsContent value="status-values" className="mt-4">
          <StatusList initialStatuses={statuses} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
