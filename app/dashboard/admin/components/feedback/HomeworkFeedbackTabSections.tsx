'use client';

import { Class } from '../../../../firebase/services/types';
import { User } from '../../../../firebase/services/user';
import AllHomeworkTable from './AllHomeworkTable';
import FilterBar from './FilterBar';
import MissingHomeworkTable from './MissingHomeworkTable';
import OverviewStats from './OverviewStats';

interface BaseTabProps {
  selectedTimeframe: string;
  setSelectedTimeframe: (value: string) => void;
  customStartDate: string;
  setCustomStartDate: (value: string) => void;
  customEndDate: string;
  setCustomEndDate: (value: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (value: string) => void;
  selectedClass: string;
  setSelectedClass: (value: string) => void;
  teachers: User[];
  classes: Class[];
  allowedClassIds?: string[];
}

export function MissingHomeworkTab({
  selectedTimeframe,
  setSelectedTimeframe,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds,
}: BaseTabProps) {
  return (
    <div className="space-y-6">
      <FilterBar
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <MissingHomeworkTable
        selectedTimeframe={selectedTimeframe}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        classes={classes}
        teachers={teachers}
        allowedClassIds={allowedClassIds}
      />
    </div>
  );
}

export function OverviewTab({
  selectedTimeframe,
  setSelectedTimeframe,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds,
}: BaseTabProps) {
  return (
    <div className="space-y-6">
      <FilterBar
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <OverviewStats
        selectedTimeframe={selectedTimeframe}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        teachers={teachers}
        classes={classes}
        allowedClassIds={allowedClassIds}
      />
    </div>
  );
}

export function AllHomeworkTab({
  selectedTimeframe,
  setSelectedTimeframe,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes,
  allowedClassIds,
}: BaseTabProps) {
  return (
    <div className="space-y-6">
      <FilterBar
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <AllHomeworkTable
        selectedTimeframe={selectedTimeframe}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        selectedTeacher={selectedTeacher}
        selectedClass={selectedClass}
        teachers={teachers}
        classes={classes}
        allowedClassIds={allowedClassIds}
      />
    </div>
  );
}

export function WithFeedbackTab(props: BaseTabProps) {
  return (
    <div className="space-y-6">
      <FilterBar
        selectedTimeframe={props.selectedTimeframe}
        setSelectedTimeframe={props.setSelectedTimeframe}
        customStartDate={props.customStartDate}
        setCustomStartDate={props.setCustomStartDate}
        customEndDate={props.customEndDate}
        setCustomEndDate={props.setCustomEndDate}
        selectedTeacher={props.selectedTeacher}
        setSelectedTeacher={props.setSelectedTeacher}
        selectedClass={props.selectedClass}
        setSelectedClass={props.setSelectedClass}
        teachers={props.teachers}
        classes={props.classes}
      />

      <FilteredHomeworkTable
        selectedTimeframe={props.selectedTimeframe}
        customStartDate={props.customStartDate}
        customEndDate={props.customEndDate}
        selectedTeacher={props.selectedTeacher}
        selectedClass={props.selectedClass}
        teachers={props.teachers}
        classes={props.classes}
        filterType="with-feedback"
        title="Bài tập đã có feedback"
        emptyMessage="Không có bài tập nào đã được feedback trong khoảng thời gian này"
        emptyIcon="✅"
      />
    </div>
  );
}

export function WithoutFeedbackTab(props: BaseTabProps) {
  return (
    <div className="space-y-6">
      <FilterBar
        selectedTimeframe={props.selectedTimeframe}
        setSelectedTimeframe={props.setSelectedTimeframe}
        customStartDate={props.customStartDate}
        setCustomStartDate={props.setCustomStartDate}
        customEndDate={props.customEndDate}
        setCustomEndDate={props.setCustomEndDate}
        selectedTeacher={props.selectedTeacher}
        setSelectedTeacher={props.setSelectedTeacher}
        selectedClass={props.selectedClass}
        setSelectedClass={props.setSelectedClass}
        teachers={props.teachers}
        classes={props.classes}
      />

      <FilteredHomeworkTable
        selectedTimeframe={props.selectedTimeframe}
        customStartDate={props.customStartDate}
        customEndDate={props.customEndDate}
        selectedTeacher={props.selectedTeacher}
        selectedClass={props.selectedClass}
        teachers={props.teachers}
        classes={props.classes}
        filterType="without-feedback"
        title="Bài tập chưa có feedback"
        emptyMessage="Tuyệt vời! Tất cả bài tập đã được feedback"
        emptyIcon="🎉"
        allowedClassIds={props.allowedClassIds}
      />
    </div>
  );
}

function FilteredHomeworkTable({
  selectedTimeframe,
  customStartDate,
  customEndDate,
  selectedTeacher,
  selectedClass,
  teachers,
  classes,
  filterType,
  title,
  emptyMessage,
  emptyIcon,
  allowedClassIds,
}: {
  selectedTimeframe: string;
  customStartDate: string;
  customEndDate: string;
  selectedTeacher: string;
  selectedClass: string;
  teachers: User[];
  classes: Class[];
  filterType: 'with-feedback' | 'without-feedback';
  title: string;
  emptyMessage: string;
  emptyIcon: string;
  allowedClassIds?: string[];
}) {
  return (
    <AllHomeworkTable
      selectedTimeframe={selectedTimeframe}
      customStartDate={customStartDate}
      customEndDate={customEndDate}
      selectedTeacher={selectedTeacher}
      selectedClass={selectedClass}
      teachers={teachers}
      classes={classes}
      feedbackFilter={filterType}
      customTitle={title}
      customEmptyMessage={emptyMessage}
      customEmptyIcon={emptyIcon}
      allowedClassIds={allowedClassIds}
    />
  );
}
