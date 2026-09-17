import { getQueueTaskById } from "../../actions";
import { notFound } from "next/navigation";
import PrepareTaskClient from "./PrepareTaskClient";

export default async function PreparePublicationPage({ params }: { params: { id: string } }) {
  const task = await getQueueTaskById(params.id);

  if (!task) {
    notFound();
  }

  return <PrepareTaskClient task={task} />;
}
